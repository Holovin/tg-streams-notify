import { EventType, Notification, OnlineStream, PlatformType } from './types.js';
import { config } from './config.js';
import { logger } from './logger.js';
import { L_StreamState, TgMsg } from './telegramMsg.js';

export function getStreamLink(stream: OnlineStream): string {
    const baseDomain = stream.platform === PlatformType.TWITCH ? 'https://twitch.tv' : '';
    return `${baseDomain}/${stream.loginNormalized}`;
}

export function postProcess(state: OnlineStream[], online: OnlineStream[]): {
    notifications: Notification[],
    state: OnlineStream[],
    toStartRecord: OnlineStream[],
    toStopRecord: OnlineStream[],
} {
    const notifications: Notification[] = [];
    const newState: OnlineStream[] = [];
    const toStartRecord: OnlineStream[] = [];
    const toStopRecord: OnlineStream[] = [];

    // Check event: Start stream
    online.forEach((onlineStream, index) => {
        const streamState = state.find(
            item => item.loginNormalized === onlineStream.loginNormalized
        );

        // Not in DB, need notification
        if (!streamState) {
            notifications.push({
                message: TgMsg.streamInfo(onlineStream, L_StreamState.START),
                photo: TgMsg.getChannelPhoto(config.streamers, onlineStream, EventType.live),
                trigger: `new stream ${onlineStream.loginNormalized}, db dump: ${JSON.stringify(state)}`,
            });
            logger.info(`postProcess: notify ${onlineStream.loginNormalized} (new)`);
            newState.push(onlineStream);

            if (config.recorder.includes(onlineStream.loginNormalized)) {
                logger.info(`postProcess: toStartRecord -- ${onlineStream.loginNormalized}`);
                toStartRecord.push(onlineStream);
            } else {
                logger.info(`postProcess: toStartRecord ${onlineStream.loginNormalized} -- skip ${JSON.stringify(config.recorder)}`);
            }
        }
        // Exist in DB, update timers
        else {
            logger.debug(`postProcess: update ${onlineStream.loginNormalized} stream`);

            if (onlineStream.title !== streamState.title) {
                logger.info(`postProcess: notify ${onlineStream.loginNormalized} (title), db index: ${index}`);

                notifications.push({
                    message: TgMsg.streamInfo(onlineStream, L_StreamState.START, '💬'),
                    photo: TgMsg.getChannelPhoto(config.streamers, onlineStream, EventType.live),
                    trigger: `title update: ${onlineStream.title} !== ${streamState.title}`,
                });
            } else if (onlineStream.game !== streamState.game) {
                logger.info(`postProcess: notify ${onlineStream.loginNormalized} (game), db index: ${index}`);

                notifications.push({
                    message: TgMsg.streamInfo(onlineStream, L_StreamState.START, '🎮'),
                    photo: TgMsg.getChannelPhoto(config.streamers, onlineStream, EventType.live),
                    trigger: `game update: ${onlineStream.game} !== ${streamState.game}`,
                });
            }

            newState.push(onlineStream);
        }
    });

    // Check event: end stream
    for (let i = state.length - 1; i >= 0; i--) {
        const stream = state[i];
        const find = online.find(
            onlineItem => onlineItem.loginNormalized === stream.loginNormalized
        );
        if (find) {
            continue;
        }

        logger.info(`postProcess: stream is dead -- ${stream.loginNormalized}`);
        notifications.push({
            message: TgMsg.streamInfo(stream, L_StreamState.END),
            photo: TgMsg.getChannelPhoto(config.streamers, stream, EventType.off),
            trigger: `notify ${stream.loginNormalized} (dead)`,
        });

        if (config.recorder.includes(stream.loginNormalized)) {
            logger.info(`postProcess: toStopRecord -- ${stream.loginNormalized}`);
            toStopRecord.push(stream);
        }
    }

    logger.debug(`postProcess: return -- ${JSON.stringify(notifications)}`);
    return {
        notifications: notifications,
        state: newState,
        toStartRecord: toStartRecord,
        toStopRecord: toStopRecord,
    };
}
