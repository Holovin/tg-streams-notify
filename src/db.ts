import Keyv from 'keyv';


export const DB_USERS = 'users';
export default async function createDbConnection(logger, channelNames: string[]) {
    const keyv = new Keyv('sqlite://db.sqlite', {
        adapter: 'sqlite',
        table: 'settings',
        busyTimeout: 10000,
    });

    const result1 = await keyv.has('test');
    await keyv.set('test', 'yes');
    const result2 = await keyv.get('test');

    if (result1 === result2) {
        logger.error('Something wrong with storage...');
    }

    if (!result1) {
        await keyv.set(DB_USERS, JSON.stringify(channelNames));
        logger.info('Init DB');
    }

    return keyv;
}
