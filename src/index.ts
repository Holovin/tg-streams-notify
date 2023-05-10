import { Bot } from 'grammy';
import nconf from 'nconf';
import TwitchApi from 'node-twitch';
import intervalToDuration from 'date-fns/intervalToDuration';
import { escapeMarkdown, sleep } from './helpers';
import axios from 'axios';
import { Channels, EventType, Notification, OnlineStream } from './types';
import { createLoggerWrap } from './logger';


const config = nconf.env().file({ file: 'config.json' });
const env = config.get('stand');
const channels = Object.fromEntries(
    Object.entries(
        config.get('twitch:channels') as Channels
    ).map(
        ([k, v], i) => [k.toLowerCase(), v]
    )
);
const channelNames = Object.keys(channels).filter(name => name !== '_');
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
const logger = createLoggerWrap(telegramToken, adminId)
const tgBaseOptions = {
    parse_mode: 'MarkdownV2',
    disable_web_page_preview: true,
};


logger.info(`== SQD StreamNotify config ==` +
    `\nStarted, settings:\n` +
    `- channels: ${JSON.stringify(channelNames)}\n` +
    `- chatId: ${chatId}\n` +
    `- adminId: ${adminId}\n` +
    `- timeout: ${timeout}\n` +
    `- heartbeat: ${heartbeatUrl}\n`
);

async function pullStreamers(twitch, channelNames) {
    const online: OnlineStream[] = [];
    const response = await twitch.getStreams({ channels: channelNames });
    logger.debug(`pullStreamers: response: ${JSON.stringify(response)}`);

    if (!response.data) {
        logger.warn(`pullStreamers: empty response??`);
        return null;
    }

    response.data.forEach(streamInfo => {
        if (streamInfo.type !== 'live') {
            return;
        }

        const startedAt = streamInfo.started_at;
        const duration = intervalToDuration({
            start: new Date(startedAt),
            end: new Date(),
        });

        const stream = {
            title: escapeMarkdown(streamInfo.title ?? ''),
            name: escapeMarkdown(streamInfo.user_name ?? ''),
            game: escapeMarkdown(streamInfo.game_name ?? ''),
            duration: `${duration.hours!.toString().padStart(2, '0')}:${duration.minutes!.toString().padStart(2, '0')}`,
            hours: duration.hours ?? -1,
        };
        online.push(stream);

        logger.debug(`pullStreamers: live -- ${stream.name}`);
    });

    logger.debug(`pullStreamers: return -- ${JSON.stringify(online)}`);
    return online;
}

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
                photo: getChannelPhoto(onlineStream, EventType.live),
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
                    photo: getChannelPhoto(onlineStream, EventType.live),
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
            photo: getChannelPhoto(stream, EventType.off),
            trigger: `notify ${stream.name} (dead)`,
        });
    }

    logger.debug(`postProcess: return -- ${JSON.stringify(notifications)}`);
    return {
        notifications: notifications,
        db: newDb
    };
}

function getStatus(stream: OnlineStream, isStarted: boolean): string {
    const duration = stream.duration.startsWith('00:0') ? '' : `for _${stream.duration}_ `;
    return `${stream.name} ${isStarted ? 'is' : 'was'} live ${duration}${isStarted ? '🔴' : '⚪️'}\n` +
        `*${stream.title}*\n\n` +
        `[Open stream on Twitch ↗](https://twitch.tv/${stream.name})`;
}

const photoMap = {
    [EventType.off]: 'photoOff',
    [EventType.live]: 'photoLive',
}

function getChannelPhoto(onlineStream: OnlineStream, eventType: EventType): string {
    return channels[onlineStream.name.toLowerCase().replace('\\', '')]?.[photoMap[eventType]]
        ?? channels['_'][photoMap[eventType]];
}

async function sendNotifications(bot, chatId, notifications: Notification[]) {
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


async function task(db: OnlineStream[]): Promise<OnlineStream[]> {
    const online = await pullStreamers(twitch, channelNames);
    if (online === null) {
        return db;
    }

    const data = postProcess(db, online);
    await sendNotifications(bot, chatId, data.notifications);

    return data.db;
}

async function tick() {
    let db: OnlineStream[] = [];

    while (true) {
        if (heartbeatUrl) {
            logger.debug( `tick: heartbeat...`);
            await axios.get(heartbeatUrl);
        }

        logger.debug( `tick: task started (${new Date()}), db: ${db.length} / ${JSON.stringify(db)}`);
        db = await task(db);

        logger.debug( `tick: task end (${new Date()}), db: ${db.length} / ${JSON.stringify(db)}`);
        await sleep(timeout);
    }
}

try {
    tick().then(() => {});
} catch (e: unknown) {
    logger.info(JSON.stringify(e));

    if (e instanceof Error) {
        logger.error(`GGWP: ${e.message}`);
    }
}
