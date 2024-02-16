import { createLogger, format, transports } from 'winston';
import WinstonTelegram from 'winston-telegram';
import { config } from './config';

const loggerFormatter = format.printf(info => {
    return `${info.level.toUpperCase().padEnd(8)} [${info.timestamp}] ${info.message}`;
});

export const logger = createLoggerWrap(config.tg.token, config.tg.adminId);

function createLoggerWrap(telegramBotToken: string, telegramChatId: number) {
    const logger = createLogger({
        format: format.combine(
            format.timestamp({ format: 'YYYY/MM/DD HH:mm:ss' }),
            loggerFormatter,
        ),
        transports: [
            new transports.Console({
                level: 'debug',
            }),
            new transports.File({
                filename: 'info.log',
                level: 'info',
            }),
            new WinstonTelegram({
                token: telegramBotToken,
                chatId: telegramChatId,
                level: 'info',
            })
        ]
    });

    logger.info('Log ready...');
    return logger;
}
