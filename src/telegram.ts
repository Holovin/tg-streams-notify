import { GrammyError } from 'grammy';
import { Bot } from 'grammy';
import { Notification } from './types.js';
import { config } from './config.js';
import { logger } from './logger.js';
import { sleep } from './helpers.js';
import { Database } from './db.js';
import { TG_CMD, TgMsg } from './telegramMsg.js';
import {
    PIN_MESSAGE_UPDATE_FIRST_DELAY_SECONDS,
    SEND_MESSAGE_DELAY_AFTER_SECONDS
} from './const.js';


export interface TgBotCallbacks {
    dbSetFunction: (key: string, value: string) => Promise<true>,
    getReFunction: () => Promise<string>,
}

export class Telegram {
    private bot = new Bot(config.tg.token);

    constructor(token: string) {
        this.bot = new Bot(token);

        logger.info(`[TelegramAPI] token = [...${token.slice(-5)}]`);
    }

    public async initBot(botCallbacks: TgBotCallbacks) {
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
}

const tgBaseOptions = {
    parse_mode: 'MarkdownV2',
    disable_web_page_preview: true,
};
