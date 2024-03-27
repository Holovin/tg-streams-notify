import { EventType, Notification, OnlineStream } from './types.js';
import { getChannelPhoto, getStatus } from './text.js';
import { config } from './config.js';
import { logger } from './logger.js';

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
        const streamState = state.find(item => item.name === onlineStream.name);

        // No in DB, need notification
        if (!streamState) {
            notifications.push({
                message: getStatus(`*${onlineStream.title}*`, onlineStream, true),
                photo: getChannelPhoto(config.streamers, onlineStream, EventType.live),
                trigger: `new stream ${onlineStream.name}, db dump: ${JSON.stringify(state)}`,
            });
            logger.info(`postProcess: notify ${onlineStream.name} (new)`);
            newState.push(onlineStream);

            if (config.recorder.includes(onlineStream.name.toLowerCase())) {
                logger.info(`postProcess: toStartRecord -- ${onlineStream.name}`);
                toStartRecord.push(onlineStream);
            } else {
                logger.info(`postProcess: toStartRecord ${onlineStream.name} -- skip ${JSON.stringify(config.recorder)}`);
            }
        }
        // Exist in DB, update timers
        else {
            logger.debug(`postProcess: update ${onlineStream.name} stream`);

            if (onlineStream.title !== streamState.title) {
                logger.info(`postProcess: notify ${onlineStream.name} (title), db index: ${index}`);

                notifications.push({
                    message: getStatus(`💬 *${onlineStream.title}*`, onlineStream, true),
                    photo: getChannelPhoto(config.streamers, onlineStream, EventType.live),
                    trigger: `title update: ${onlineStream.title} !== ${streamState.title}`,
                });
            } else if (onlineStream.game !== streamState.game) {
                logger.info(`postProcess: notify ${onlineStream.name} (game), db index: ${index}`);

                notifications.push({
                    message: getStatus(`🎮 *${onlineStream.title}* · ${onlineStream.game}`, onlineStream, true),
                    photo: getChannelPhoto(config.streamers, onlineStream, EventType.live),
                    trigger: `game update: ${onlineStream.game} !== ${streamState.game}`,
                });
            }

            newState.push(onlineStream);
        }
    });

    // Check event: end stream
    for (let i = state.length - 1; i >= 0; i--) {
        const stream = state[i];
        const find = online.find(onlineItem => onlineItem.name === stream.name);
        if (find) {
            continue;
        }

        logger.info(`postProcess: stream is dead -- ${stream.name}`);
        notifications.push({
            message: getStatus(`*${stream.title}*`, stream, false),
            photo: getChannelPhoto(config.streamers, stream, EventType.off),
            trigger: `notify ${stream.name} (dead)`,
        });

        if (config.recorder.includes(stream.name)) {
            logger.info(`postProcess: toStopRecord -- ${stream.name}`);
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
