import { Channels, EventType, OnlineStream, photoMap, USER_RESERVED } from './types';

export function getStatus(stream: OnlineStream, isStarted: boolean): string {
    const duration = stream.duration.startsWith('00:0') ? '' : `for _${stream.duration}_ `;
    return `${stream.name} ${isStarted ? 'is' : 'was'} live ${duration}${isStarted ? '🔴' : '⚪️'}\n` +
        `*${stream.title}*\n\n` +
        `[Open stream on Twitch ↗](https://twitch.tv/${stream.name})`;
}

export function getShortStatus(streams: OnlineStream[]): string {
    let message = ``;

    if (!streams.length) {
        message += `⚪ Everybody is offline`;
        return message;
    }

    message += `🔴 ${streams.length} online`;

    streams.forEach(stream => {
        message += `\n· [${stream.name}](https://twitch.tv/${stream.name}) *${stream.title}*`;
    });

    return message;
}

export function getChannelPhoto(channels: Channels, onlineStream: OnlineStream|null, eventType: EventType): string {
    if (onlineStream) {
        return channels[onlineStream.name.toLowerCase().replace('\\', '')]?.[photoMap[eventType]];
    }

    return channels[USER_RESERVED][photoMap[eventType]];
}
