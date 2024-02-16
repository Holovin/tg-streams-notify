import { Notification } from './types';
import { sleep } from './helpers';
import { GrammyError } from 'grammy';
import { logger } from './logger';


export const tgBaseOptions = {
    parse_mode: 'MarkdownV2',
    disable_web_page_preview: true,
};

export async function updatePin(bot, chatId: number, msgId: number, message: string): Promise<boolean> {
    try {
        logger.debug(`updatePin: try ${chatId}:${msgId} -- ${message}`);
        await bot.api.editMessageText(chatId, msgId, message, tgBaseOptions);
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

export async function sendNotifications(bot, chatId: number, notifications: Notification[]) {
    for (const notification of notifications) {
        if (notification.photo) {
            await bot.api.sendPhoto(
                chatId,
                notification.photo,
                {
                    caption: notification.message,
                    ...tgBaseOptions,
                },
            );

        } else {
            await bot.api.sendMessage(chatId, notification.message, tgBaseOptions);
        }

        logger.info(`sendNotifications: send -- ${chatId}, ${notification.message}`);
        await sleep(5);
    }
}
