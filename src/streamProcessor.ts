import { EventType, Notification, OnlineStream } from './types';
import { getChannelPhoto, getStatus } from './text';
import { config } from './config';
import { logger } from './logger';

export function postProcess(state: OnlineStream[], online: OnlineStream[]): {
    notifications: Notification[],
    state: OnlineStream[],
} {
    const notifications: Notification[] = [];
    const newState: OnlineStream[] = [];

    // Check event: Start stream
    online.forEach((onlineStream, index) => {
        const streamState = state.find(item => item.name === onlineStream.name);

        // No in DB, need notification
        if (!streamState) {
            notifications.push({
                message: getStatus(onlineStream, true),
                photo: getChannelPhoto(config.streamers, onlineStream, EventType.live),
                trigger: `new stream ${onlineStream.name}, db dump: ${JSON.stringify(state)}`,
            });
            logger.info(`postProcess: notify ${onlineStream.name} (new)`);

            newState.push(onlineStream);
        }
        // Exist in DB, update timers
        else {
            logger.debug(`postProcess: update ${onlineStream.name} stream`);
            if (onlineStream.title !== streamState.title) {
                logger.info(`postProcess: notify ${onlineStream.name} (title), db index: ${index}`);
                notifications.push({
                    message: getStatus(onlineStream, true),
                    photo: getChannelPhoto(config.streamers, onlineStream, EventType.live),
                    trigger: `title update: ${onlineStream.title} !== ${streamState.title}`,
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
            message: getStatus(stream, false),
            photo: getChannelPhoto(config.streamers, stream, EventType.off),
            trigger: `notify ${stream.name} (dead)`,
        });
    }

    logger.debug(`postProcess: return -- ${JSON.stringify(notifications)}`);
    return {
        notifications: notifications,
        state: newState
    };
}
