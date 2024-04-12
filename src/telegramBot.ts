import { Context, GrammyError, NextFunction } from 'grammy';
import { Bot } from 'grammy';
import { Notification, OnlineStream } from './types.js';
import { config } from './config.js';
import { logger } from './logger.js';
import { sleep } from './helpers.js';
import { Database } from './db.js';
import { TG_CMD, TgMsg } from './telegramMsg.js';
import {
    PIN_MESSAGE_UPDATE_FIRST_DELAY_SECONDS, PIN_MESSAGE_UPDATE_FORCE_DELAY_SECONDS,
    SEND_MESSAGE_DELAY_AFTER_SECONDS,
} from './const.js';


export interface TgBotCallbacks {
    getPinInfo: () => Promise<{ msgId: number, online: OnlineStream[] }>;
    dbSetFunction: (key: string, value: string) => Promise<true>;
    getReFunction: () => Promise<string>;
}

export class TelegramBot {
    private bot = new Bot(config.tg.token);

    constructor(token: string) {
        this.bot = new Bot(token);

        logger.info(`[TelegramAPI] token = [...${token.slice(-5)}]`);
    }

    public async initBot(botCallbacks: TgBotCallbacks) {
        this.bot.use(this.checkAccess.bind(this));

        this.bot.command(TG_CMD.PIN, async ctx => {
            const chatId = ctx?.message?.chat?.id;
            if (!chatId || chatId !== config.tg.adminId) {
                logger.debug(`pin: skip message from chat -- ${chatId}`);
                return;
            }

            const msg = await this.sendMessageMd(chatId, TgMsg.pinLoading());
            await botCallbacks.dbSetFunction(Database.getChatIdKey(chatId), msg.message_id.toString());
            logger.info(`pin: db updated`);

            await sleep(PIN_MESSAGE_UPDATE_FIRST_DELAY_SECONDS);
            await this.updatePin(chatId, msg.message_id, TgMsg.pinReady(msg.message_id));
            logger.info(`pin: messageID -- ${msg.message_id}`);
        });

        this.bot.command(TG_CMD.RECORDER,  async (ctx) => {
            const chatId = ctx?.message?.chat?.id;
            if (!chatId || chatId !== config.tg.adminId) {
                logger.debug(`pin: skip message from chat -- ${chatId}`);
                return;
            }

            const message= await botCallbacks.getReFunction();
            await this.sendMessageMd(chatId, message);
        });

        this.bot.command(TG_CMD.PIN_UPDATE_FORCE,  async (ctx) => {
            const chatId = ctx?.message?.chat?.id;
            if (!chatId || chatId !== config.tg.adminId) {
                logger.debug(`pinUpdateForce: skip message from chat -- ${chatId}`);
                return;
            }

            const data = await botCallbacks.getPinInfo();
            await this.updatePin(config.tg.chatId, data.msgId, TgMsg.getShortStatus(data.online));
            await sleep(PIN_MESSAGE_UPDATE_FORCE_DELAY_SECONDS);
            await this.sendMessageMd(config.tg.adminId, TgMsg.pinMsgForceUpdate());
        });

        this.bot.catch((error) => {
            logger.error(JSON.stringify(error));

            const message = TgMsg.errorMessageStack(error.message, error.stack ?? 'No error stack');
            this.bot.api.sendMessage(config.tg.adminId, message, { parse_mode: 'MarkdownV2' });
        });

    }

    public async sendNotifications(chatId: number, notifications: Notification[]) {
        for (const notification of notifications) {
            if (notification.photo) {
                await this.bot.api.sendPhoto(
                    chatId,
                    notification.photo,
                    {
                        caption: notification.message,
                        ...tgBaseOptions,
                    } as any,
                );

            } else {
                await this.sendMessageMd(chatId, notification.message);
            }

            logger.info(`sendNotifications: send -- ${chatId}, ${notification.message}`);
            await sleep(SEND_MESSAGE_DELAY_AFTER_SECONDS);
        }
    }

    public async sendMessageMd(chatId: number, message: string) {
        return this.bot.api.sendMessage(chatId, message, { ...tgBaseOptions as any });
    }

    public async updatePin(chatId: number, msgId: number, message: string): Promise<boolean> {
        try {
            logger.debug(`updatePin: try ${chatId}:${msgId} -- ${message}`);
            await this.bot.api.editMessageText(chatId, msgId, message, { ...tgBaseOptions as any });
            logger.debug(`updatePin: done ${chatId}:${msgId} -- ${message}`);

        } catch (e) {
            logger.warn(`updatePin: can't update message ${chatId}:${msgId}`);

            if (e instanceof GrammyError) {
                if (e.description.startsWith('Bad Request: message is not modified')) {
                    logger.debug(`updatePin: same message error, just ignore`);
                    return true;
                }
            }

            if (e instanceof Error) {
                logger.error(`updatePin: error - ${e.message}`);
            }

            return false;
        }

        return true;
    }

    public async start() {
        return this.bot.start();
    }

    private async checkAccess(ctx: Context, next: NextFunction): Promise<void> {
        if (ctx.update.my_chat_member) {
            if (ctx.update.my_chat_member.from.id !== config.tg.adminId) {
                logger.info(`mid: skip message from --  ${ctx.update.update_id} -- ${ctx.update.my_chat_member.from.id}`);
                await this.sendMessageMd(config.tg.adminId, TgMsg.errorAccess(ctx.update.my_chat_member.from.id, JSON.stringify(ctx.update)));
                return;
            }

            return next();
        }

        const chatId = ctx.message?.chat?.id;
        if (!chatId || (chatId !== config.tg.chatId && chatId !== config.tg.adminId)) {
            logger.info(`mid: skip message from --  ${ctx.update.update_id} -- ${chatId}`);
            await this.sendMessageMd(config.tg.adminId, TgMsg.errorAccess(chatId ?? 0, JSON.stringify(ctx.update)));
            return;
        }

        return next();
    }
}

const tgBaseOptions = {
    parse_mode: 'MarkdownV2',
    disable_web_page_preview: true,
};
