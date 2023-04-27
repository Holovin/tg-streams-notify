import { Bot } from 'grammy';
import nconf from 'nconf';
import TwitchApi from 'node-twitch';
import intervalToDuration from 'date-fns/intervalToDuration';
import { escapeMarkdown, log, sleep } from './helpers';
import axios from 'axios';
import { Channels, EventType, Notification, OnlineStream } from './types';


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
const twitch = new TwitchApi({
    client_id: config.get('twitch:id'),
    client_secret: config.get('twitch:secret')
});

const bot = new Bot(config.get('telegram:token'));
const tgBaseOptions = {
    parse_mode: 'MarkdownV2',
    disable_web_page_preview: true,
};


log(`main`,
    `\nStarted, settings:\n` +
    `- channels: ${JSON.stringify(channels)}\n` +
    `- chatId: ${chatId}\n` +
    `- adminId: ${adminId}\n` +
    `- timeout: ${timeout}\n` +
    `- heartbeat: ${heartbeatUrl}\n`
);

async function pullStreamers(twitch, channelNames) {
    const online: OnlineStream[] = [];
    const response = await twitch.getStreams({ channels: channelNames });
    log(`pullStreamers`, `response: ${JSON.stringify(response)}`);

    if (!response.data) {
        log(`pullStreamers`, `Empty response??`);
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

        log(`pullStreamers`, `live: ${stream.name}`);
    });

    log(`pullStreamers`, `return: ${JSON.stringify(online)}`);
    return online;
}

function postProcess(db: OnlineStream[], online: OnlineStream[], channels: Channels): Notification[] {
    const notifications: Notification[] = [];

    // Check event: Start stream
    online.forEach((onlineStream, index) => {
        const streamDb = db.find(item => item.name === onlineStream.name);

        // No in DB, need notification
        if (!streamDb) {
            notifications.push({
                message: getStatus(onlineStream, true),
                photo: getChannelPhoto(onlineStream, EventType.live),
            });
            db.push(onlineStream);
            log(`postProcess`, `new stream ${onlineStream.name}`);

        }
        // Exist in DB, update timers
        else {
            log(`postProcess`, `update ${onlineStream.name} stream`);
            const oldStream = db[index];
            if (onlineStream.title != oldStream.title) {
                notifications.push({
                    message: getStatus(onlineStream, true),
                    photo: getChannelPhoto(onlineStream, EventType.live),
                });
            }

            db[index] = onlineStream;
        }
    });

    // Check event: end stream
    for (let i = db.length - 1; i >= 0; i--) {
        const stream = db[i];
        const find = online.find(onlineItem => onlineItem.name === stream.name);
        if (find) {
            continue;
        }

        log(`postProcess`, `stream is dead: ${stream.name}`);
        notifications.push({
            message: getStatus(stream, false),
            photo: getChannelPhoto(stream, EventType.off),
        });

        db.splice(i);
    }

    log(`postProcess`, `return: ${JSON.stringify(notifications)}`);
    return notifications;
}

function getStatus(stream: OnlineStream, isStarted: boolean): string {
    return `${stream.name} ${isStarted ? 'is' : 'was'} live for _${stream.duration}_ ${isStarted ? '🔴' : '⚪️'}\n` +
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

        log(`sendNotifications`,`send: ${chatId}, ${notification.message}`);
        await sleep(5);
    }
}


async function task(db: OnlineStream[]): Promise<void> {
    const online = await pullStreamers(twitch, channelNames);
    if (online === null) {
        return;
    }

    const notifications = postProcess(db, online, channels);
    await sendNotifications(bot, chatId, notifications);
}

async function tick() {
    const db: OnlineStream[] = [];

    await sendNotifications(bot, adminId, [{
        message: `Running \\(${env}\\)\\.\\.\\.`,
    }]);

    while (true) {
        if (heartbeatUrl) {
            log( `tick`, `heartbeat...`);
            await axios.get(heartbeatUrl);
        }

        log( `tick`, `task started (${new Date()}), db: ${db.length} / ${JSON.stringify(db)}`);
        await task(db);

        log( `tick`, `task end (${new Date()}), db: ${db.length} / ${JSON.stringify(db)}`);
        await sleep(timeout);
    }
}

tick().then(() => {});
