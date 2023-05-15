import { OnlineStream, UserInfo } from './types';
import intervalToDuration from 'date-fns/intervalToDuration';
import { escapeMarkdown } from './helpers';


export async function pullStreamers(twitch, channelNames, logger): Promise<OnlineStream[] | null> {
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

export async function pullUsers(twitch, channelNames, logger): Promise<UserInfo[]> {
    const response = await twitch.getUsers(channelNames);
    const channelsAlive = response.data.map(channel => ({
        name: channel.login.toLowerCase(),
        displayName: channel.displayName,
    }));

    logger.debug(`pullUsers: ${JSON.stringify(channelsAlive)}`);
    return channelsAlive;
}
