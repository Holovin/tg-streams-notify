import axios from 'axios';
import { getArrDiff, sleep } from './helpers.js';
import { EventType, Notification, OnlineStream } from './types.js';
import { logger } from './logger.js';
import { Database } from './db.js';
import { Twitch } from './twitch.js';
import { TelegramBot } from './telegramBot.js';
import { config } from './config.js';
import { getStreamLink, postProcess } from './streamProcessor.js';
import { Recorder } from './recorder.js';
import { L_DiskState, L_RecordState, TgMsg } from './telegramMsg.js';
import {
    CHECK_DISK_ALERT_AFTER_MINUTES,
    CHECK_DISK_WARN_GB_LOW_ALERT_REPEAT_MINUTES,
    CHECK_DISK_WARN_GB_LOW_THRESHOLD,
} from './const.js';

logger.info(`== SQD StreamNotify config ==` +
    `\nStarted, settings:\n` +
    `- channels Twitch: ${JSON.stringify(config.streamers.twitch.streamerNames)}\n` +
    `- chatId: ${config.tg.chatId}\n` +
    `- adminId: ${config.tg.adminId}\n` +
    `- timeout: ${config.timeout}\n` +
    `- heartbeat: ${config.heartbeatUrl}\n`
);

class App {
    private state: OnlineStream[] = [];
    private db: Database;
    private twitch: Twitch;
    private bot: TelegramBot;
    private recorder: Recorder;
    private lastRecorderNotification: Date = new Date(0);

    public constructor() {
        this.db = new Database();
        this.twitch = new Twitch(config.twitch.id, config.twitch.secret);
        this.bot = new TelegramBot(config.tg.token);
        this.recorder = new Recorder();
    }

    public async main() {
        await this.init();

        this.bot.start().then(() => {
            logger.warn('Bot died somehow...');
        });

        // noinspection InfiniteLoopJS
        while (true) {
            if (config.heartbeatUrl) {
                logger.debug( `tick: heartbeat...`);
                await axios.get(config.heartbeatUrl);
            }

            logger.debug( `tick: checkOnline, (${new Date()}), state: ${this.state.length}`);
            const online = await this.taskCheckOnline();

            logger.debug( `tick: stateProcess, (${new Date()}), state: ${this.state.length} `);
            this.state = await this.stateHandler(this.state, online);

            // logger.debug( `tick: checkBansTwitch, (${new Date()}), state: ${this.state.length}`);
            // await this.taskCheckBansTwitch();

            if (this.recorder.getActiveRecordings().length > 0) {
                logger.debug( `tick: checkDiskState, (${new Date()})`);
                const notifications = await this.checkDiskState();
                if (notifications.length > 0) {
                    await this.bot.sendNotifications(config.tg.adminId, notifications);
                }
            }

            logger.debug( `tick: loop done, (${new Date()})`);
            await sleep(config.timeout);
        }
    }

    public async beforeCrash() {
        logger.warn(`beforeCrash: Try to warn`);
        return this.bot.sendMessageMd(config.tg.adminId, TgMsg.beforeCrash());
    }

    private async taskCheckOnline(): Promise<OnlineStream[]> {
        const out: OnlineStream[] = [];

        if (config.streamers.twitch.streamerNames.length > 0) {
            out.push(...(await this.twitch.pullTwitchStreamers(config.streamers.twitch.streamerNames)));
        }

        return out;
    }

    private async taskCheckBansTwitch(): Promise<void> {
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
                message: TgMsg.userBanned(
                    TgMsg.getChannelDisplayName(
                        config.streamers.twitch.streamers, Twitch.normalizeStreamerLogin(user), user),
                ),
                photo: TgMsg.getChannelPhoto(config.streamers, null, EventType.banned),
                trigger: 'banned (new)',
            });
        });

        unbanned.forEach(user => {
            notifications.push({
                message: TgMsg.userUnbanned(
                    TgMsg.getChannelDisplayName(
                        config.streamers.twitch.streamers, Twitch.normalizeStreamerLogin(user), user),
                ),
                photo: TgMsg.getChannelPhoto(config.streamers, null, EventType.unbanned),
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
        const callbackGetPin = async (key: string, value: string) => {
            logger.info(`pin [callback]: reset current state`);
            this.state = [];
            return this.db.set(key, value);
        };

        const callbackGetRe = async () => {
            logger.info(`re [callback]`);
            const state = await Recorder.getFreeSpace();
            return TgMsg.diskState(L_DiskState.OK, state.freeAvailableG, this.recorder.getActiveRecordings());
        }

        const callbackGetPinInfo = async () => {
            logger.info(`getPinInfo [callback]`);

            const msgID = await this.db.get(Database.getChatIdKey(config.tg.chatId));

            return {
                msgId: msgID,
                online: this.state,
            }
        }

        await this.db.init(config.streamers.twitch.streamerNames);
        await this.bot.initBot({
            dbSetFunction: callbackGetPin,
            getReFunction: callbackGetRe,
            getPinInfo: callbackGetPinInfo,
        });
    }

    private async stateHandler(state: OnlineStream[], online: OnlineStream[]): Promise<OnlineStream[]> {
        const data = postProcess(state, online);
        if (data.notifications.length > 0) {
            await this.bot.sendNotifications(config.tg.chatId, data.notifications);

            const msgID = await this.db.get(Database.getChatIdKey(config.tg.chatId));
            if (msgID) {
                const isDone = await this.bot.updatePin(config.tg.chatId, msgID, TgMsg.getShortStatus(online));
                if (!isDone) {
                    // TODO: rework
                    // await this.db.delete(Database.getChatIdKey(config.tg.chatId));
                    logger.info(`checkOnline: chatID = ${config.tg.chatId} MAYBE SHOULD BE removed from DB`);
                }
            }
        }

        if (data.toStopRecord.length > 0) {
            const notifications: Notification[] = [];
            logger.info(`stateProcess: stop queue -- ${data.toStopRecord.length}`);

            for (const rec of data.toStopRecord) {
                const result = this.recorder.stopByUrl(getStreamLink(rec));
                notifications.push({
                    message: TgMsg.recorderInfo(L_RecordState.END, rec.loginNormalized, result),
                    trigger: 'recorder+stop',
                });
            }

            await this.bot.sendNotifications(config.tg.adminId, notifications);
        }

        if (data.toStartRecord.length > 0) {
            const notifications: Notification[] = [];
            logger.info(`stateProcess: start queue -- ${data.toStartRecord.length}`);

            for (const rec of data.toStartRecord) {
                await this.recorder.add(getStreamLink(rec), rec.loginNormalized);
                notifications.push({
                    message: TgMsg.recorderInfo(L_RecordState.START, rec.loginNormalized),
                    trigger: 'recorder+add'
                });
            }

            await this.bot.sendNotifications(config.tg.adminId, notifications);
        }

        return data.state;
    }

    private async checkDiskState(): Promise<Notification[]> {
        const freeSpace = await Recorder.getFreeSpace();
        if (!freeSpace) {
            logger.error(`checkDiskState: no response!`);
            return [{
                message: TgMsg.diskState(L_DiskState.ERROR, 0, this.recorder.getActiveRecordings()),
                trigger: `checkDiskState ERR`,
            }];
        }

        const diff = Date.now() - this.lastRecorderNotification.getTime();
        if (diff > CHECK_DISK_WARN_GB_LOW_ALERT_REPEAT_MINUTES
            && freeSpace.freeAvailableG < CHECK_DISK_WARN_GB_LOW_THRESHOLD
        ) {
            this.updateLastRN();
            return [{
                message: TgMsg.diskState(L_DiskState.WARN, freeSpace.freeAvailableG, this.recorder.getActiveRecordings()),
                trigger: `checkDiskState <${CHECK_DISK_WARN_GB_LOW_THRESHOLD}`
            }];
        }

        if (diff > CHECK_DISK_ALERT_AFTER_MINUTES) {
            this.updateLastRN();
            return [{
                message: TgMsg.diskState(L_DiskState.OK, freeSpace.freeAvailableG, this.recorder.getActiveRecordings()),
                trigger: `checkDiskState OK`,
            }];
        }

        return [];
    }

    private updateLastRN() {
        this.lastRecorderNotification = new Date();
    }
}

const app = new App();
try {
    app.main().then();

} catch (e: unknown) {
    logger.info(JSON.stringify(e));

    if (e instanceof Error) {
        logger.error(`GGWP: ${e.message}`);
    }

    app.beforeCrash().then();
    logger.error(`Crashed...`);
}
