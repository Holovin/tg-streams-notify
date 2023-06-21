import { createLogger, format, Logger as LoggerType, transports, verbose } from 'winston';
import WinstonTelegram from 'winston-telegram';


abstract class Singleton {
    protected static instance: Singleton;
    protected constructor() { }
    public static getInstance() { }
}

export class Logger2 extends Singleton {
    protected static instance: Logger2;

    private log!: LoggerType;

    protected constructor(tgToken: string, tgChatId: number) {
        super();
        this.init(tgToken, tgChatId);
    }

    private init(tgToken: string, tgChatId: number) {
        this.log = createLogger({
            format: format.combine(
                format.timestamp({ format: 'YYYY/MM/DD HH:mm:ss' }),
                format.printf(info => {
                    return `${info.level.toUpperCase().padEnd(8)} ` +
                           `[${info.timestamp}] (${info.service.padEnd(15, ' ') ?? '?'}) ${info.message}`;
                }),
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
                    token: tgToken,
                    chatId: tgChatId,
                    level: 'info',
                })
            ]
        });
    }

    public static setup(tgToken: string, tgChatId: number) {
        if (Logger2.instance) {
            throw new Error('Logger2 already initialized');
        }

        Logger2.instance = new Logger2(tgToken, tgChatId);
    }

    public static getInstance(): Logger2 {
        if (!Logger2.instance) {
            throw new Error('Logger2 not initialized');
        }

        return Logger2.instance;
    }

    public getLogger(moduleName: string): LoggerType {
        return this.log.child( { service: moduleName });
    }
}
