import { intervalToDuration } from 'date-fns/intervalToDuration';
import { OnlineStream, PlatformType, UserInfo } from './types.js';
import { logger } from './logger.js';
import { TwitchApi } from 'node-twitch';


export class Twitch {
    private tv: TwitchApi;

    public constructor(id: string, secret: string) {
        this.tv = new TwitchApi({
            client_id: id,
            client_secret: secret,
        });

        logger.info(`[TwitchAPI] id = [...${id.slice(-5)}], secret = [...${secret.slice(-5)}]`);
    }

    public async pullTwitchStreamers(channelNames): Promise<OnlineStream[]> {
        const online: OnlineStream[] = [];
        let response;

        try {
            response = await this.tv.getStreams({ channels: channelNames });
            logger.debug(`pullTwitchStreamers: response: ${JSON.stringify(response)}`);

        } catch (e) {
            if (e instanceof Error) {
                logger.error(`pullTwitchStreams: ${e.message}`);

            } else {
                logger.error(`pullTwitchStreams: ???`);
            }

            return [];
        }

        if (!response || !response.data) {
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

            if (!duration.hours) {
                duration.hours = 0;
            }

            if (!duration.minutes) {
                duration.minutes = 0;
            }

            const stream: OnlineStream = {
                title: streamInfo.title ?? '',
                login: streamInfo.user_name ?? '',
                loginNormalized: Twitch.normalizeStreamerLogin(streamInfo.user_name) ?? '',
                game: streamInfo.game_name ?? '',
                duration: `${duration.hours.toString().padStart(2, '0')}:${duration.minutes.toString().padStart(2, '0')}`,
                hours: duration.hours ?? -1,
                platform: PlatformType.TWITCH,
            };
            online.push(stream);

            logger.debug(`pullTwitchStreamers: live -- ${stream.loginNormalized}`);
        });

        logger.debug(`pullTwitchStreamers: return -- ${JSON.stringify(online)}`);
        return online;
    }

    public async pullTwitchAliveUsers(channelNames): Promise<UserInfo[]|null> {
        try {
            const response = await this.tv.getUsers(channelNames);
            const channelsAlive = response.data.map(channel => ({
                name: Twitch.normalizeStreamerLogin(channel.login),
                displayName: channel.display_name,
            }));

            logger.debug(`pullTwitchAliveUsers: ${JSON.stringify(channelsAlive)}`);
            return channelsAlive;

        } catch (e) {
            return null;
        }
    }

    public static normalizeStreamerLogin(login: string): string {
        return login.toLowerCase().replace('\\', '');
    }
}
