import { Bot } from 'grammy';
import nconf from 'nconf';
import TwitchApi from 'node-twitch';
import { getArrDiff, sleep } from './helpers';
import axios from 'axios';
import { Channels, EventType, Notification, OnlineStream, photoMap, USER_RESERVED } from './types';
import { createLoggerWrap } from './logger';
import createDbConnection, { DB_USERS } from './db';
import { pullStreamers, pullUsers } from './twitch';
import { sendNotifications } from './telegram';
import { getChannelPhoto, getStatus } from './text';


const config = nconf.env().file({ file: 'config.json' });
const channels: Channels = Object.fromEntries(Object.entries(config.get('twitch:channels') as Channels)
    // Normalize channel names from config
    .map(([k, v], i) => [k.toLowerCase(), v])
);
const channelNames = Object.keys(channels).filter(name => name !== USER_RESERVED);
const chatId = +config.get('telegram:chat');
const adminId = +config.get('telegram:admin');
const heartbeatUrl = config.get('heartbeat');
const timeout = config.get('twitch:timeout');
const telegramToken = config.get('telegram:token');

const twitch = new TwitchApi({
    client_id: config.get('twitch:id'),
    client_secret: config.get('twitch:secret')
});

const bot = new Bot(telegramToken);
const logger = createLoggerWrap(telegramToken, adminId);

logger.info(`== SQD StreamNotify config ==` +
    `\nStarted, settings:\n` +
    `- channels: ${JSON.stringify(channelNames)}\n` +
    `- chatId: ${chatId}\n` +
    `- adminId: ${adminId}\n` +
    `- timeout: ${timeout}\n` +
    `- heartbeat: ${heartbeatUrl}\n`
);

function postProcess(db: OnlineStream[], online: OnlineStream[]): {
    notifications: Notification[],
    db: OnlineStream[],
} {
    const notifications: Notification[] = [];
    const newDb: OnlineStream[] = [];

    // Check event: Start stream
    online.forEach((onlineStream, index) => {
        const streamDb = db.find(item => item.name === onlineStream.name);

        // No in DB, need notification
        if (!streamDb) {
            notifications.push({
                message: getStatus(onlineStream, true),
                photo: getChannelPhoto(channels, onlineStream, EventType.live),
                trigger: `new stream ${onlineStream.name}, db dump: ${JSON.stringify(db)}`,
            });
            logger.info(`postProcess: notify ${onlineStream.name} (new)`);

            newDb.push(onlineStream);
        }
        // Exist in DB, update timers
        else {
            logger.debug(`postProcess: update ${onlineStream.name} stream`);
            if (onlineStream.title !== streamDb.title) {
                logger.info(`postProcess: notify ${onlineStream.name} (title), db index: ${index}`);
                notifications.push({
                    message: getStatus(onlineStream, true),
                    photo: getChannelPhoto(channels, onlineStream, EventType.live),
                    trigger: `title update: ${onlineStream.title} !== ${streamDb.title}`,
                });
            }

            newDb.push(onlineStream);
        }
    });

    // Check event: end stream
    for (let i = db.length - 1; i >= 0; i--) {
        const stream = db[i];
        const find = online.find(onlineItem => onlineItem.name === stream.name);
        if (find) {
            continue;
        }

        logger.info(`postProcess: stream is dead -- ${stream.name}`);
        notifications.push({
            message: getStatus(stream, false),
            photo: getChannelPhoto(channels, stream, EventType.off),
            trigger: `notify ${stream.name} (dead)`,
        });
    }

    logger.debug(`postProcess: return -- ${JSON.stringify(notifications)}`);
    return {
        notifications: notifications,
        db: newDb
    };
}

async function taskCheckBans(db): Promise<void> {
    const usersSaved: string[] = JSON.parse(await db.get(DB_USERS));
    const usersFresh = await pullUsers(twitch, channelNames, logger);
    const usersFreshFlat = usersFresh.map(user => user.name);

    const banned = getArrDiff<string>(usersSaved, usersFreshFlat);
    const unbanned = getArrDiff<string>(usersFreshFlat, usersSaved);

    const notifications: Notification[] = [];

    logger.debug(`checkBans: banned -- ${JSON.stringify(banned)}`);
    logger.debug(`checkBans: unbanned -- ${JSON.stringify(unbanned)}`);

    banned.forEach(user => {
        notifications.push({
            message: `*${getChannelDisplayName(channels, user)}* is banned\\!`,
            photo: getChannelPhoto(channels, null, EventType.banned),
            trigger: 'banned (new)',
        });
    });

    unbanned.forEach(user => {
        notifications.push({
            message: `*${getChannelDisplayName(channels, user)}* is unbanned\\!`,
            photo: getChannelPhoto(channels, null, EventType.unbanned),
            trigger: 'unbanned (new)',
        });
    });

    await sendNotifications(bot, chatId, notifications, logger);

    if (banned.length > 0 || unbanned.length > 0) {
        await db.set(DB_USERS, JSON.stringify(usersFreshFlat));
        logger.info(`checkBans: update DB done`);
    }
}

function getChannelDisplayName(channels: Channels, user: string) {
    return channels[user]?.displayName ?? user;
}

async function taskCheckOnline(db: OnlineStream[]): Promise<OnlineStream[]> {
    const online = await pullStreamers(twitch, channelNames, logger);
    if (online === null) {
        return db;
    }

    const data = postProcess(db, online);
    await sendNotifications(bot, chatId, data.notifications, logger);

    return data.db;
}

async function main() {
    const db = await createDbConnection(logger, channelNames);
    let store: OnlineStream[] = [];

    while (true) {
        if (heartbeatUrl) {
            logger.debug( `tick: heartbeat...`);
            await axios.get(heartbeatUrl);
        }

        logger.debug( `tick: task 0/2, (${new Date()}), store: ${store.length} / ${JSON.stringify(store)}`);
        store = await taskCheckOnline(store);

        logger.debug( `tick: task 1/2, (${new Date()}), store: ${store.length} / ${JSON.stringify(store)}`);
        await sleep(timeout);

        await taskCheckBans(db);
        logger.debug( `tick: task 2/2, (${new Date()})`);

        await sleep(timeout);
    }
}

try {
    main().then(() => {});
} catch (e: unknown) {
    logger.info(JSON.stringify(e));

    if (e instanceof Error) {
        logger.error(`GGWP: ${e.message}`);
    }
}
