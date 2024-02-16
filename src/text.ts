import { Channels, EventType, OnlineStream, photoMap, PlatformType } from './types';
import { Streamers } from './config';

const platformInfo = {
    [PlatformType.TWITCH]: {
        emoji: '🔴',
        label: 'Twitch',
    },

    [PlatformType.KICK]: {
        emoji: '🟢',
        label: 'Kick'
    },
}

export function getStatus(stream: OnlineStream, isStarted: boolean): string {
    const duration = stream.duration.startsWith('00:0') ? '' : `for _${stream.duration}_ `;
    return `${stream.name} ${isStarted ? 'is' : 'was'} live ` +
        `${duration}${isStarted ?  platformInfo[stream.platform].emoji : '⚪️'}\n` +
        `*${stream.title}*\n\n` +
        getStreamMarkdownLink(stream, `[Open stream on ${platformInfo[stream.platform].label} ↗]`);
}

export function getShortStatus(streams: OnlineStream[]): string {
    let message = ``;

    if (!streams.length) {
        message += `⚪ Everybody is offline`;
        return message;
    }

    const isSomeTwitch = streams.some(stream => stream.platform === PlatformType.TWITCH);
    if (isSomeTwitch) {
        message += platformInfo[PlatformType.TWITCH].emoji;
    }

    const isSomeKick = streams.some(stream => stream.platform === PlatformType.KICK);
    if (isSomeKick) {
        message += platformInfo[PlatformType.KICK].emoji;
    }

    message += ` ${streams.length} online`;

    streams.forEach(stream => {
        message += `\n· ${getStreamMarkdownLink(stream)} *${stream.title}*`;
    });

    return message;
}

export function getChannelPhoto(streamers: Streamers, onlineStream: OnlineStream|null, eventType: EventType): string {
    if (onlineStream) {
        const platform = onlineStream.platform === PlatformType.TWITCH
            ? streamers.twitch
            : streamers.kick;

        return platform.streamers[onlineStream.name.toLowerCase().replace('\\', '')]?.[photoMap[eventType]];
    }

    return streamers.defaultChannelValues[photoMap[eventType]];
}

export function getChannelDisplayName(channels: Channels, user: string) {
    return channels[user]?.displayName ?? user;
}

function getStreamMarkdownLink(stream: OnlineStream, text = ''): string {
    const baseDomain = stream.platform === PlatformType.TWITCH
        ? 'https://twitch.tv'
        : 'https://kick.com';

    return `[${text === '' ? stream.name : text}](${baseDomain}/${stream.name})`;
}
