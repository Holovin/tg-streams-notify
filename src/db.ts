import { Logger } from 'winston';
import { Logger2 } from './logger2';


export const DB_USERS = 'users';
export const DB_CHAT = 'chatid';

export class Db {
    private logger: Logger;
    private channelNames: string[];

    public static getChatIdKey(chatId: number): string {
        return `${DB_CHAT}_${chatId}`;
    }

    public constructor(channelNames: string[]) {
        this.logger = Logger2.getInstance().getLogger('DB');
        this.channelNames = channelNames;
    }

    public async init(): Promise<void> {
        // const keyv = new Keyv('sqlite://db.sqlite', {
        //     adapter: 'sqlite',
        //     table: 'settings',
        //     busyTimeout: 10000,
        // });
        //
        // const result1 = await keyv.has('test');
        // await keyv.set('test', 'yes');
        // const result2 = await keyv.get('test');
        //
        // if (result1 === result2) {
        //     this.logger.error('Something wrong with storage...');
        // }
        //
        // if (!result1) {
        //     await keyv.set(DB_USERS, JSON.stringify(this.channelNames));
        //     this.logger.info('Init DB');
        // }
        //
        // return keyv;
    }
}
