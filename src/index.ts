import { getArrDiff, sleep } from './helpers';
import axios from 'axios';
import { EventType, Notification, OnlineStream } from './types';
import { logger } from './logger';
import { Database } from './db';
import { Twitch } from './twitch';
import { Telegram } from './telegram';
import { getChannelDisplayName, getChannelPhoto, getShortStatus } from './text';
import { config } from './config';
import { postProcess } from './streamProcessor';

logger.info(`== SQD StreamNotify config ==` +
    `\nStarted, settings:\n` +
    `- channels Twitch: ${JSON.stringify(config.streamers.twitch.streamerNames)}\n` +
    `- chatId: ${config.tg.chatId}\n` +
    `- adminId: ${config.tg.adminId}\n` +
    `- timeout: ${config.timeout}\n` +
    `- heartbeat: ${config.heatbeatUrl}\n`
);

class App {
    private state: OnlineStream[] = [];
    private db: Database;
    private twitch: Twitch;
    private bot: Telegram;

    public constructor() {
        this.db = new Database();
        this.twitch = new Twitch(config.twitch.id, config.twitch.secret);
        this.bot = new Telegram(config.tg.token);
    }

    public async main() {
        await this.init();

        this.bot.start().then(() => {
            logger.warn('Bot died somehow...');
        });

        while (true) {
            if (config.heatbeatUrl) {
                logger.debug( `tick: heartbeat...`);
                await axios.get(config.heatbeatUrl);
            }

            logger.debug( `tick: checkOnline, (${new Date()}), state: ${this.state.length}`);
            const online = await this.taskCheckOnline();

            logger.debug( `tick: stateProcess, (${new Date()}), state: ${this.state.length} `);
            this.state = await this.stateProcess(this.state, online);

            await sleep(config.timeout);

            logger.debug( `tick: checkBansTwitch, (${new Date()}), state: ${this.state.length}`);
            await this.taskCheckBansTwitch();

            logger.debug( `tick: loop done, (${new Date()})`);
            await sleep(config.timeout);
        }
    }

    public async taskCheckOnline(): Promise<OnlineStream[]> {
        const out: OnlineStream[] = [];

        if (config.streamers.twitch.streamerNames.length > 0) {
            out.push(...(await this.twitch.pullTwitchStreamers(config.streamers.twitch.streamerNames)));
        }

        return out;
    }

    public async taskCheckBansTwitch(): Promise<void> {
        const usersSaved: string[] = JSON.parse(await this.db.get(Database.DB_USERS));
        const usersFresh = await this.twitch.pullTwitchAliveUsers(config.streamers.twitch.streamerNames);
        if (!usersFresh) {
            logger.warn(`checkBans: no answer from API, skip`);
            return;
        }

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

        await this.bot.sendNotifications(config.tg.chatId, notifications);
        if (banned.length > 0 || unbanned.length > 0) {
            await this.db.set(Database.DB_USERS, JSON.stringify(usersFreshFlat));
            logger.info(`checkBans: update DB done`);
        }
    }

    private async init() {
        await this.db.init(config.streamers.twitch.streamerNames);
        await this.bot.initBot(this.db.set);
    }

    private async stateProcess(state, online) {
        const data = postProcess(state, online);
        if (data.notifications.length > 0) {
            await this.bot.sendNotifications(config.tg.chatId, data.notifications);

            const msgID = await this.db.get(Database.getChatIdKey(config.tg.chatId));
            if (msgID) {
                const isDone = await this.bot.updatePin(config.tg.chatId, msgID, getShortStatus(online));
                if (!isDone) {
                    await this.db.delete(Database.getChatIdKey(config.tg.chatId));
                    logger.info(`checkOnline: chatID = ${config.tg.chatId} removed from DB`);
                }
            }
        }

        return data.state;
    }
}

try {
    const app = new App();
    app
        .main()
        .then(() => {});

} catch (e: unknown) {
    logger.info(JSON.stringify(e));

    if (e instanceof Error) {
        logger.error(`GGWP: ${e.message}`);
    }
}
