import { Bot } from 'grammy';
import nconf from 'nconf';
import TwitchApi from 'node-twitch';
import intervalToDuration from 'date-fns/intervalToDuration';
import { log, sleep, escapeMarkdown } from './helpers';
import axios from 'axios';


interface OnlineStream {
    title: string;
    name: string;
    game: string;
    duration: string;
    hours: number;
}

const config = nconf.env().file({ file: 'config.json' });
const channels = config.get('twitch:channels');
const chatId = +config.get('id:chat');
const adminId = +config.get('id:admin');
const heartbeatUrl = config.get('heartbeat');
const timeout = config.get('twitch:timeout');
const twitch = new TwitchApi({
    client_id: config.get('twitch:id'),
    client_secret: config.get('twitch:secret')
});

const bot = new Bot(config.get('telegram:token'));


log(`main`,
    `\nStarted, settings:\n` +
    `- channels: ${JSON.stringify(channels)}\n` +
    `- chatId: ${chatId}\n` +
    `- adminId: ${adminId}\n` +
    `- timeout: ${timeout}\n` +
    `- heartbeat: ${heartbeatUrl}\n`
);

async function pullStreamers(twitch, channels) {
    const online: OnlineStream[] = [];
    const response = await twitch.getStreams({ channels: channels });
    log(`pullStreamers`, `response: ${JSON.stringify(response)}`);

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

function postProcess(db: OnlineStream[], online: OnlineStream[]): string[] {
    const notifications: string[] = [];

    // Check event: Start stream
    online.forEach((onlineStream, index) => {
        const streamDb = db.find(item => item.name === onlineStream.name);

        // No in DB, need notification
        if (!streamDb) {
            notifications.push(getStatus(onlineStream, true));
            db.push(onlineStream);
            log(`postProcess`, `new stream ${onlineStream.name}`);

        }
        // Exist in DB, update timers
        else {
            log(`postProcess`, `update ${onlineStream.name} stream`);
            const oldStream = db[index];
            if (oldStream.hours != oldStream.hours) {
                // TODO: add notification
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
        notifications.push(getStatus(stream, false));

        db.splice(i);
    }

    log(`postProcess`, `return: ${JSON.stringify(notifications)}`);
    return notifications;
}

function getStatus(stream: OnlineStream, isStarted: boolean): string {
    return `${stream.name} ${isStarted ? 'is' : 'was'} live for ${stream.duration} ${isStarted ? '🔴' : '⚪️'}\n` +
           `*${stream.title}*\n\n` +
            `[Open stream on Twitch ↗](https://twitch.tv/${stream.name})`;
}

async function sendNotifications(bot, chatId, notifications: string[]) {
    if (notifications.length === 0) {
        return;
    }

    for (const notification of notifications) {
        await bot.api.sendMessage(
            chatId,
            notification,
            { parse_mode: 'MarkdownV2', disable_web_page_preview: true },
        );
        log(`sendNotifications`,`send: ${chatId}, ${notification}`);

        await sleep(5);
    }
}


async function task(db: OnlineStream[]): Promise<void> {
    const online = await pullStreamers(twitch, channels);
    const notifications = postProcess(db, online);
    await sendNotifications(bot, chatId, notifications);
}

async function tick() {
    const db: OnlineStream[] = [];

    await sendNotifications(bot, adminId, ['Running']);

    while (true) {
        log( `tick`, `heartbeat...`);
        await axios.get(heartbeatUrl);

        log( `tick`, `task started (${new Date()}), db: ${db.length} / ${JSON.stringify(db)}`);
        await task(db);

        log( `tick`, `task end (${new Date()}), db: ${db.length} / ${JSON.stringify(db)}`);
        await sleep(timeout);
    }
}

tick().then(() => {});
