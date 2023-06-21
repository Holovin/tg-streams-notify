import { Notification } from './types';
import { sleep } from './helpers';
import { Bot, GrammyError } from 'grammy';
import { Logger } from 'winston';
import { Logger2 } from './logger2';


export const tgBaseOptions = {
    parse_mode: 'MarkdownV2',
    disable_web_page_preview: true,
};


export class Telegram {
    private logger: Logger;
    private bot: Bot;

    public static escapeMarkdown(message: string): string {
        return message
            .replace(/\_/g, '\\_')
            .replace(/\*/g, '\\*')
            .replace(/\[/g, '\\[')
            .replace(/\]/g, '\\]')
            .replace(/\(/g, '\\(')
            .replace(/\)/g, '\\)')
            .replace(/\~/g, '\\~')
            .replace(/\`/g, '\\`')
            .replace(/\>/g, '\\>')
            .replace(/\#/g, '\\#')
            .replace(/\+/g, '\\+')
            .replace(/\-/g, '\\-')
            .replace(/\=/g, '\\=')
            .replace(/\|/g, '\\|')
            .replace(/\{/g, '\\{')
            .replace(/\}/g, '\\}')
            .replace(/\./g, '\\.')
            .replace(/\!/g, '\\!');
    }

    public constructor(token: string) {
        this.logger = Logger2.getInstance().getLogger('tg');

        this.bot = new Bot(token);

        // TODO
        this.bot.command('get_pin', async ctx => {
            const chatId = ctx?.message?.chat?.id;
            if (!chatId || chatId !== chatId) {
                this.logger.debug(`get_pin: skip message from chat -- ${chatId}`);
                return;
            }

            const msg = await this.bot.api.sendMessage(
                chatId,
                Telegram.escapeMarkdown(`Loading messageID...`),
                tgBaseOptions as any
            );
            // await this.db.set(getChatIdKey(chatId), msg.message_id);
            this.logger.info(`get_pin: db updated`);

            await this.updatePin(
                chatId,
                msg.message_id,
                Telegram.escapeMarkdown(`Now this message will be update every minute (${msg.message_id})`)
            );
            this.logger.info(`get_pin: messageID -- ${msg.message_id}`);
        });
    }

    public async start() {
        return this.bot.start();
    }

    public async updatePin(chatId: number, msgId: number, message: string): Promise<boolean> {
        try {
            this.logger.debug(`updatePin: try ${chatId}:${msgId} -- ${message}`);
            await this.bot.api.editMessageText(chatId, msgId, message, tgBaseOptions as any);
            this.logger.debug(`updatePin: done ${chatId}:${msgId} -- ${message}`);

        } catch (e) {
            this.logger.warn(`updatePin: can't update message ${chatId}:${msgId}`);

            if (e instanceof GrammyError) {
                if (e.description.startsWith('Bad Request: message is not modified')) {
                    this.logger.debug(`updatePin: same message error, just ignore`);
                    return true;
                }
            }

            if (e instanceof Error) {
                this.logger.error(`updatePin: error - ${e.message}`);
            }

            return false;
        }

        return true;
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
                    } as any
                );

            } else {
                await this.bot.api.sendMessage(chatId, notification.message, tgBaseOptions as any);
            }

            this.logger.info(`sendNotifications: send -- ${chatId}, ${notification.message}`);
            await sleep(1000);
        }
    }
}
