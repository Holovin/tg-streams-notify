import { OnlineStream, PlatformType, UserInfo } from './types';
import intervalToDuration from 'date-fns/intervalToDuration';
import { escapeMarkdown } from './helpers';
import { logger } from './logger';


export async function pullTwitchStreamers(twitch, channelNames): Promise<OnlineStream[]> {
    const online: OnlineStream[] = [];
    const response = await twitch.getStreams({ channels: channelNames });
    logger.debug(`pullTwitchStreamers: response: ${JSON.stringify(response)}`);

    if (!response.data) {
        logger.warn(`pullTwitchStreamers: empty response??`);
        return [];
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

        const stream: OnlineStream = {
            title: escapeMarkdown(streamInfo.title ?? ''),
            name: escapeMarkdown(streamInfo.user_name ?? ''),
            game: escapeMarkdown(streamInfo.game_name ?? ''),
            duration: `${duration.hours!.toString().padStart(2, '0')}:${duration.minutes!.toString().padStart(2, '0')}`,
            hours: duration.hours ?? -1,
            platform: PlatformType.TWITCH,
        };
        online.push(stream);

        logger.debug(`pullTwitchStreamers: live -- ${stream.name}`);
    });

    logger.debug(`pullTwitchStreamers: return -- ${JSON.stringify(online)}`);
    return online;
}

export async function pullTwitchAliveUsers(twitch, channelNames): Promise<UserInfo[]> {
    const response = await twitch.getUsers(channelNames);
    const channelsAlive = response.data.map(channel => ({
        name: channel.login.toLowerCase(),
        displayName: channel.displayName,
    }));

    logger.debug(`pullTwitchAliveUsers: ${JSON.stringify(channelsAlive)}`);
    return channelsAlive;
}
