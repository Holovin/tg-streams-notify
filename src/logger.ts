import { createLogger, format, transports } from 'winston';
import WinstonTelegram from 'winston-telegram';

const loggerFormatter = format.printf(info => {
    return `${info.level.toUpperCase().padEnd(8)} [${info.timestamp}] ${info.message}`;
});

export function createLoggerWrap(telegramBotToken: string, telegramChatId: number) {
    return createLogger({
        format: format.combine(
            format.timestamp({ format: 'YYYY/MM/DD HH:mm:ss' }),
            loggerFormatter,
        ),
        level: 'info',
        transports: [
            new transports.File({
                filename: 'info.log',
                level: 'info',
            }),
            // new transports.File({ filename: 'debug.log' }),
            new transports.Console({ level: 'info' }),
            new WinstonTelegram({
                token: telegramBotToken,
                chatId: telegramChatId,
                level: 'info',
            })
        ]
    });
}
