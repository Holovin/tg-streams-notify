import Keyv from 'keyv';
import TwitchApi from 'node-twitch';
import { escapeMarkdown, getArrDiff, sleep } from './helpers';
import axios from 'axios';
import { Kient } from 'kient';
import { EventType, Notification, OnlineStream } from './types';
import { logger } from './logger';
import createDbConnection, { DB_USERS, getChatIdKey } from './db';
import { pullTwitchStreamers, pullTwitchAliveUsers } from './twitch';
import { sendNotifications, tgBaseOptions, updatePin } from './telegram';
import { getChannelDisplayName, getChannelPhoto, getShortStatus, getStatus } from './text';
import { pullKickStreamers } from './kick';
import { config } from './config';
import { postProcess } from './streamProcessor';
import { bot } from './bot';

logger.info(`== SQD StreamNotify config ==` +
    `\nStarted, settings:\n` +
    `- channels Twitch: ${JSON.stringify(config.streamers.twitch.streamerNames)}\n` +
    `- channels Kick: ${JSON.stringify(config.streamers.kick.streamerNames)}\n` +
    `- chatId: ${config.tg.chatId}\n` +
    `- adminId: ${config.tg.adminId}\n` +
    `- timeout: ${config.timeout}\n` +
    `- heartbeat: ${config.heatbeatUrl}\n`
);

async function taskCheckBansTwitch(twitch, db: Keyv): Promise<void> {
    const usersSaved: string[] = JSON.parse(await db.get(DB_USERS));
    const usersFresh = await pullTwitchAliveUsers(twitch, config.streamers.twitch.streamerNames);
    const usersFreshFlat = usersFresh.map(user => user.name);

    const banned = getArrDiff<string>(usersSaved, usersFreshFlat);
    const unbanned = getArrDiff<string>(usersFreshFlat, usersSaved);

    const notifications: Notification[] = [];

    logger.debug(`checkBans: banned -- ${JSON.stringify(banned)}`);
    logger.debug(`checkBans: unbanned -- ${JSON.stringify(unbanned)}`);

    banned.forEach(user => {
        notifications.push({
            message: `*${getChannelDisplayName(config.streamers.twitch.streamers, user)}* is banned\\!`,
            photo: getChannelPhoto(config.streamers, null, EventType.banned),
            trigger: 'banned (new)',
        });
    });

    unbanned.forEach(user => {
        notifications.push({
            message: `*${getChannelDisplayName(config.streamers.twitch.streamers, user)}* is unbanned\\!`,
            photo: getChannelPhoto(config.streamers, null, EventType.unbanned),
            trigger: 'unbanned (new)',
        });
    });

    await sendNotifications(bot, config.tg.chatId, notifications);

    if (banned.length > 0 || unbanned.length > 0) {
        await db.set(DB_USERS, JSON.stringify(usersFreshFlat));
        logger.info(`checkBans: update DB done`);
    }
}

async function taskCheckOnline(twitch, kick): Promise<OnlineStream[]> {
    const out: OnlineStream[] = [];

    out.push(...(await pullTwitchStreamers(twitch, config.streamers.twitch.streamerNames)));
    out.push(...(await pullKickStreamers(kick, config.streamers.kick.streamerNames)));

    return out;
}

async function stateProcess(state, online, db: Keyv) {
    const data = postProcess(state, online);
    if (data.notifications.length > 0) {
        await sendNotifications(bot, config.tg.chatId, data.notifications);

        const msgID = await db.get(getChatIdKey(config.tg.chatId));
        if (msgID) {
            const isDone = await updatePin(bot, config.tg.chatId, msgID, getShortStatus(online));
            if (!isDone) {
                await db.delete(getChatIdKey(config.tg.chatId));
                logger.info(`checkOnline: chatID = ${config.tg.chatId} removed from DB`);
            }
        }
    }

    return data.state;
}

async function initBot(bot, db: Keyv) {
    bot.command('get_pin', async ctx => {
        const chatId = ctx?.message?.chat?.id;
        if (!chatId || chatId !== chatId) {
            logger.debug(`get_pin: skip message from chat -- ${chatId}`);
            return;
        }

        const msg = await bot.api.sendMessage(chatId, escapeMarkdown(`Loading messageID...`), tgBaseOptions);
        await db.set(getChatIdKey(chatId), msg.message_id);
        logger.info(`get_pin: db updated`);

        await sleep(2);
        await updatePin(bot, chatId, msg.message_id, escapeMarkdown(`Now this message will be update every minute (${msg.message_id})`));
        logger.info(`get_pin: messageID -- ${msg.message_id}`);
    });
}

async function main() {
    const db = await createDbConnection(logger, config.streamers.twitch.streamerNames);
    let state: OnlineStream[] = [];

    const twitch = new TwitchApi({
        client_id: config.twitch.id,
        client_secret: config.twitch.secret,
    });

    const kick = await Kient.create();

    await initBot(bot, db);
    bot.start().then(() => { logger.warn('HOW?') });

    while (true) {
        if (config.heatbeatUrl) {
            logger.debug( `tick: heartbeat...`);
            await axios.get(config.heatbeatUrl);
        }

        logger.debug( `tick: checkOnline, (${new Date()}), state: ${state.length} / ${JSON.stringify(state)}`);
        const online = await taskCheckOnline(twitch, kick);

        logger.debug( `tick: stateProcess, (${new Date()}), state: ${state.length} / ${JSON.stringify(state)}`);
        state = await stateProcess(state, online, db);

        await sleep(config.timeout);

        logger.debug( `tick: checkBansTwitch, (${new Date()}), state: ${state.length} / ${JSON.stringify(state)}`);
        await taskCheckBansTwitch(twitch, db);

        logger.debug( `tick: loop done, (${new Date()})`);
        await sleep(config.timeout);
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
