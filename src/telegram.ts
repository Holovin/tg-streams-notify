import { Notification } from './types';
import { sleep } from './helpers';


const tgBaseOptions = {
    parse_mode: 'MarkdownV2',
    disable_web_page_preview: true,
};

export async function sendNotifications(bot, chatId, notifications: Notification[], logger) {
    if (notifications.length === 0) {
        return;
    }

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
            await bot.api.sendMessage(
                chatId,
                notification.message,
                { ...tgBaseOptions },
            );
        }

        logger.info(`sendNotifications: send -- ${chatId}, ${notification.message}`);
        await sleep(5);
    }
}
