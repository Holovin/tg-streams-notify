import { intervalToDuration } from 'date-fns/intervalToDuration';
import { OnlineStream, PlatformType, UserInfo } from './types.js';
import { logger } from './logger.js';
import { ApiClient, HelixStream } from '@twurple/api';
import { AppTokenAuthProvider } from '@twurple/auth';
import { rawDataSymbol } from '@twurple/common';


export class Twitch {
    private readonly auth: AppTokenAuthProvider;
    private readonly api: ApiClient;

    public constructor(id: string, secret: string) {
        this.auth = new AppTokenAuthProvider(id, secret);
        this.api = new ApiClient({ authProvider: this.auth });

        logger.info(`[TwitchAPI] id = [...${id.slice(-5)}], secret = [...${secret.slice(-5)}]`);
    }

    public async pullTwitchStreamers(channelNames: string[]): Promise<OnlineStream[]> {
        const online: OnlineStream[] = [];
        let helixStreams: HelixStream[];

        try {
            helixStreams = await this.api.streams.getStreamsByUserNames(channelNames);
            logger.debug(`pullTwitchStreamers: response: ${(helixStreams.map(stream => JSON.stringify(stream[rawDataSymbol])))}`);

        } catch (e) {
            if (e instanceof Error) {
                logger.error(`pullTwitchStreams: ${e.message}`);

            } else {
                logger.error(`pullTwitchStreams: ???`);
            }

            return [];
        }

        if (!helixStreams) {
            logger.warn(`pullTwitchStreamers: empty response??`);
            return [];
        }

        helixStreams.forEach(helixStream => {
            if (helixStream.type !== 'live') {
                return;
            }

            const startedAt = helixStream.startDate;
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
                title: helixStream.title ?? '',
                login: helixStream.userName ?? '',
                loginNormalized: Twitch.normalizeStreamerLogin(helixStream.userName) ?? '',
                game: helixStream.gameName ?? '',
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

    public async pullTwitchAliveUsers(channelNames: string[]): Promise<UserInfo[]|null> {
        try {
            const users = await this.api.users.getUsersByNames(channelNames);
            logger.debug(`pullTwitchAliveUsers: ${users.map(user => JSON.stringify(user[rawDataSymbol]))}`);

            const channelsAlive = users.map(user => ({
                name: Twitch.normalizeStreamerLogin(user.name),
                displayName: user.displayName,
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
