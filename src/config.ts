import nconf from 'nconf';
import { Channel, Channels } from './types.js';

export interface Streamers {
    twitch: {
        streamers: Channels;
        streamerNames: string[];
    }

    defaultChannelValues: Channel;
}

export interface Config {
    tg: {
        chatId: number;
        adminId: number;
        token: string;
    }

    twitch: {
        id: string;
        secret: string;
    }

    env: string;
    recorder: string[];
    timeout: number;
    streamers: Streamers;
    heartbeatUrl: string;
}

const nconfig = nconf.env().file({ file: 'config.json' });

export const config: Config = {
    tg: {
        chatId: +nconfig.get('telegram:chat'),
        adminId: +nconfig.get('telegram:admin'),
        token: nconfig.get('telegram:token'),
    },

    twitch: {
        id: nconfig.get('twitch:id'),
        secret: nconfig.get('twitch:secret'),
    },

    env: nconfig.get('env'),
    recorder: nconfig.get('recorder') ?? [],
    streamers: readStreamersConfig(),
    heartbeatUrl: nconfig.get('heartbeat'),
    timeout: nconfig.get('timeout')
}

function readStreamersConfig(): Streamers {
    const twitchConfig = getChannelsFromConfig('twitch:channels');

    return {
        twitch: {
            streamers: twitchConfig,
            streamerNames: getChannelNamesFromChannels(twitchConfig),
        },
        defaultChannelValues: nconfig.get('defaultChannelValues') as Channel,
    };
}

function getChannelsFromConfig(configKey: string): Channels {
    return (
        Object.fromEntries(
            Object.entries(
                nconfig.get(configKey) as Channels
            )
                .map(([k, v], i) => [k.toLowerCase(), v])
        )
    );
}

function getChannelNamesFromChannels(channels: Channels): string[] {
    return Object.keys(channels);
}
