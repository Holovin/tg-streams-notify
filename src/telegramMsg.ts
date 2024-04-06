import { StreamRecord } from './recorder.js';
import { format } from 'date-fns/format';
import { config, Streamers } from './config.js';
import { Channels, EventType, OnlineStream, photoEventMap, PlatformType } from './types.js';
import { getStreamLink } from './streamProcessor.js';

export enum L_DiskState {
    ERROR,
    WARN,
    OK,
}

export enum L_RecordState {
    START,
    END,
}

export enum L_StreamState {
    START,
    END,
}

export const TG_CMD = {
    PIN: 'get_pin',
    RECORDER: 'get_re',
    PIN_UPDATE_FORCE: 'pin_force',
}

const platformInfo = {
    [PlatformType.TWITCH]: {
        emoji: '🔴',
        label: 'Twitch',
    },
}

export class TgMsg {
    public static beforeCrash(): string {
        return this.escMd(`Bot totally crashed!!!`);
    }

    public static pinLoading(): string {
        return this.escMd(`Loading messageID...`);
    }

    public static pinReady(messageId: number): string {
        return this.escMd(`Now this message will be update every minute (${messageId})`);
    }

    public static userBanned(name: string): string {
        return `*${name}* ` + this.escMd(`is banned!`);
    }

    public static userUnbanned(name: string): string {
        return `*${name}* ` + this.escMd(`is unbanned!`);
    }

    public static diskState(state: L_DiskState, freeSpace: number, activeRecordings: StreamRecord[]): string {
        const lng = ({
            [L_DiskState.OK]:    ['💁', 'Disk space state'],
            [L_DiskState.WARN]:  ['🚨', 'LOW DISK SPACE'],
            [L_DiskState.ERROR]: ['🧯', 'ERROR DISK SPACE'],
        })[state];

        return `${lng[0]} *${this.escMd(lng[1])}*: `
            + this.escMd(freeSpace.toString())
            + `\n\n${this.formatRecordingsToList(activeRecordings)}`;
    }

    public static recorderInfo(state: L_RecordState, url: string, isOk = false): string {
        const lng = ({
            [L_RecordState.START]: ['💁', 'Start'],
            [L_RecordState.END]:   ['💁', 'End'],
        })[state];

        let extra = '';
        if (state === L_RecordState.END) {
            extra += '\n';
            extra += isOk ? 'Stopped ok' : 'Not stopped';
        }

        return `${lng[0]} *${lng[1]} recording* ${this.escMd(`-- ${url}`)}${extra}`;
    }

    public static errorMessageStack(message: string, stack: string): string {
        return `🧨 *${this.escMd(message ?? 'Error')}*\n` +
            '```' + this.escMd(stack + '') + '```'
        ;
    }

    public static getChannelDisplayName(channels: Channels, loginNormalized: string, login: string): string {
        return channels[loginNormalized]?.displayName ?? login;
    }

    public static streamInfo(stream: OnlineStream, state: L_StreamState, extraPreTitle = ''): string {
        const lng = ({
            [L_StreamState.START]: [platformInfo[stream.platform].emoji, 'is'],
            [L_StreamState.END]:   ['⚪️', 'was'],
        })[state];

        const duration = stream.duration.startsWith('00:0') ? '' : `for _${stream.duration}_ `;
        const streamName = this.getChannelDisplayName(
            config.streamers.twitch.streamers, stream.loginNormalized, stream.login);
        const streamUrl = this.getStreamMarkdownLink(
            stream, `[Open stream on ${platformInfo[stream.platform].label} ↗]`);
        const streamGame = stream.game ? ` · ${this.escMd(stream.game)}` : '';

        return `${extraPreTitle !== '' ? extraPreTitle + ' ' : ''}${streamName} ${lng[1]} live ` +
            `${duration}${lng[0]}\n` +
            `*${this.escMd(stream.title)}*${streamGame}\n\n` +
            streamUrl;
    }

    public static getShortStatus(streams: OnlineStream[]): string {
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
            message += `\n· ${this.getStreamMarkdownLink(stream)} *${this.escMd(stream.title)}*`;
        });

        return message;
    }

    public static getChannelPhoto(streamers: Streamers, onlineStream: OnlineStream|null, eventType: EventType): string {
        if (onlineStream) {
            const platform = streamers.twitch;
            const streamerName = onlineStream.loginNormalized;

            return platform.streamers[streamerName]?.[photoEventMap[eventType]]
                ?? streamers.defaultChannelValues[photoEventMap[eventType]];
        }

        return streamers.defaultChannelValues[photoEventMap[eventType]];
    }

    private static formatRecordingsToList(recordings: StreamRecord[]): string {
        if (!recordings.length) {
            return 'There is no active recordings';
        }

        return recordings
            .map((record, index) => {
                return TgMsg.escMd(
                    `${index + 1}. ${record.url} • started: ${format(record.startTime, 'yyyy-MM-dd HH:mm:ss')}`
                );
            })
            .join('\n');
    }

    private static getStreamMarkdownLink(stream: OnlineStream, text = ''): string {
        return `[${text === '' ? stream.loginNormalized : text}](${getStreamLink(stream)})`;
    }

    private static escMd(message: string): string {
        return message
            .replace(/_/g, '\\_')
            .replace(/\*/g, '\\*')
            .replace(/\[/g, '\\[')
            .replace(/]/g, '\\]')
            .replace(/\(/g, '\\(')
            .replace(/\)/g, '\\)')
            .replace(/~/g, '\\~')
            .replace(/`/g, '\\`')
            .replace(/>/g, '\\>')
            .replace(/#/g, '\\#')
            .replace(/\+/g, '\\+')
            .replace(/-/g, '\\-')
            .replace(/=/g, '\\=')
            .replace(/\|/g, '\\|')
            .replace(/\{/g, '\\{')
            .replace(/}/g, '\\}')
            .replace(/\./g, '\\.')
            .replace(/!/g, '\\!');
    }
}
