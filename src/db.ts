import Keyv from 'keyv';
import { logger } from './logger.js';


export class Database {
    public static readonly DB_USERS = 'users';
    public static readonly DB_CHAT = 'chatid';

    private db: Keyv;

    constructor() {
        this.db = new Keyv('sqlite://db.sqlite', {
            adapter: 'sqlite',
            table: 'settings',
            busyTimeout: 10000,
        });
    }

    public static getChatIdKey(chatId: number): string {
        return `${Database.DB_CHAT}_${chatId}`;
    }

    public async get(key: string) {
        return this.db.get(key);
    }

    public async has(key: string) {
        return this.db.has(key);
    }

    public async delete(key: string) {
        return this.db.delete(key);
    }

    public async set(key: string, value: string) {
        return this.db.set(key, value);
    }

    public async init(channelNames: string[]) {
        const result1 = await this.has('test');
        await this.set('test', 'yes');
        const result2 = await this.get('test');

        if (result1 === result2) {
            logger.error('Something wrong with storage...');
        }

        const users = await this.has(Database.DB_USERS);
        if (!users) {
            await this.set(Database.DB_USERS, JSON.stringify(channelNames));
            logger.info('Init DB (1st time)');
        }

        logger.info('Init DB done...');
    }
}
