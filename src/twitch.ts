import { OnlineStream, UserInfo } from './types';
import intervalToDuration from 'date-fns/intervalToDuration';
import TwitchApi from 'node-twitch';
import { Logger2 } from './logger2';
import { Logger } from 'winston';
import { Telegram } from './telegram';


export class Twitch {
    private twitch: TwitchApi;
    private logger: Logger;

    public constructor(clientId: string, clientSecret: string) {
        this.logger = Logger2.getInstance().getLogger('twitch');
        this.twitch = new TwitchApi({
            client_id: clientId,
            client_secret: clientSecret,
        });
    }

    public async pullStreamers(channelNames: string[]): Promise<OnlineStream[] | null> {
        const online: OnlineStream[] = [];
        const response = await this.twitch.getStreams({ channels: channelNames });
        this.logger.debug(`pullStreamers: response: ${JSON.stringify(response)}`);

        if (!response.data) {
            this.logger.warn(`pullStreamers: empty response??`);
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
                title: Telegram.escapeMarkdown(streamInfo.title ?? ''),
                name: Telegram.escapeMarkdown(streamInfo.user_name ?? ''),
                game: Telegram.escapeMarkdown(streamInfo.game_name ?? ''),
                duration: `${duration.hours!.toString().padStart(2, '0')}:${duration.minutes!.toString().padStart(2, '0')}`,
                hours: duration.hours ?? -1,
            };
            online.push(stream);

            this.logger.debug(`pullStreamers: live -- ${stream.name}`);
        });

        this.logger.debug(`pullStreamers: return -- ${JSON.stringify(online)}`);
        return online;
    }

    public async pullUsers(channelNames: string[]): Promise<UserInfo[]> {
        const response = await this.twitch.getUsers(channelNames);
        const channelsAlive = response.data.map(channel => ({
            name: channel.login.toLowerCase(),
            displayName: channel.display_name, // TODO: check this
        }));

        this.logger.debug(`pullUsers: ${JSON.stringify(channelsAlive)}`);
        return channelsAlive;
    }
}
