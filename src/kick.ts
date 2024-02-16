import { OnlineStream, PlatformType } from './types';
import { Kient } from 'kient';
import intervalToDuration from 'date-fns/intervalToDuration';
import { escapeMarkdown } from './helpers';
import { logger } from './logger';


export async function pullKickStreamers(kient: Kient, channelNames): Promise<OnlineStream[]> {
    const online: OnlineStream[] = [];
    for (const channelName of channelNames) {
        const response = await kient.api.channel.getChannel(channelName);
        if (!response.data) {
            logger.warn(`pullKickStreamers: empty response??`);
            continue;
        }

        if (!response.data.livestream) {
            continue;
        }

        const duration = intervalToDuration({
            start: new Date(response.data.livestream.start_time),
            end: new Date(),
        });

        const stream: OnlineStream = {
            title: escapeMarkdown(response.data.livestream.session_title ?? ''),
            name: escapeMarkdown(response.data.user.username ?? ''),
            game: escapeMarkdown(response.data.livestream.categories[0].name ?? ''),
            duration: `${duration.hours!.toString().padStart(2, '0')}:${duration.minutes!.toString().padStart(2, '0')}`,
            hours: duration.hours ?? -1,
            platform: PlatformType.KICK,
        };

        online.push(stream);
        logger.debug(`pullKickStreamers: live -- ${stream.name}`);
    }

    logger.debug(`pullKickStreamers: return -- ${JSON.stringify(online)}`);
    return online;
}

