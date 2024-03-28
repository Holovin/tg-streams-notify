import { Channels, EventType, OnlineStream, photoEventMap, PlatformType } from './types.js';
import { Streamers, config } from './config.js';
import { escapeMarkdown } from './helpers.js';
import { format } from 'date-fns/format';
import { StreamRecord } from './recorder.js';

const platformInfo = {
    [PlatformType.TWITCH]: {
        emoji: '🔴',
        label: 'Twitch',
    },
}

export function getStatus(title: string, stream: OnlineStream, isOnline: boolean): string {
    const duration = stream.duration.startsWith('00:0') ? '' : `for _${stream.duration}_ `;
    const streamName = getChannelDisplayName(config.streamers.twitch.streamers, stream.loginNormalized, stream.login);
    const streamUrl = getStreamMarkdownLink(stream, `[Open stream on ${platformInfo[stream.platform].label} ↗]`);

    return `${streamName} ${isOnline ? 'is' : 'was'} live ` +
        `${duration}${isOnline ? platformInfo[stream.platform].emoji : '⚪️'}\n` +
        `${title}\n\n` +
        streamUrl;
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

    message += ` ${streams.length} online`;

    streams.forEach(stream => {
        message += `\n· ${getStreamMarkdownLink(stream)} *${stream.title}*`;
    });

    return message;
}

export function getChannelPhoto(streamers: Streamers, onlineStream: OnlineStream|null, eventType: EventType): string {
    if (onlineStream) {
        const platform = streamers.twitch;
        const streamerName = onlineStream.loginNormalized;
        return platform.streamers[streamerName]?.[photoEventMap[eventType]] ?? streamers.defaultChannelValues[photoEventMap[eventType]];
    }

    return streamers.defaultChannelValues[photoEventMap[eventType]];
}

export function getChannelDisplayName(channels: Channels, loginNormalized: string, login: string) {
    return channels[loginNormalized]?.displayName ?? login;
}

export function getStreamLink(stream: OnlineStream): string {
    const baseDomain = stream.platform === PlatformType.TWITCH ? 'https://twitch.tv' : '';
    return `${baseDomain}/${stream.loginNormalized}`;
}

export function formatRecordings(recordings: StreamRecord[]): string {
    return recordings
        .map((record, index) => {
            return escapeMarkdown(`${index + 1}. ${record.url} • from: ${format(record.startTime, 'yyyy-MM-dd HH:mm:ss')}`);
        })
        .join('\n');
}

function getStreamMarkdownLink(stream: OnlineStream, text = ''): string {
    return `[${text === '' ? stream.loginNormalized : text}](${getStreamLink(stream)})`;
}
