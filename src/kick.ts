import { OnlineStream, PlatformType } from './types';
import { Kient } from 'kient';
import intervalToDuration from 'date-fns/intervalToDuration';
import { escapeMarkdown } from './helpers.js';
import { logger } from './logger';

export class Kick {
    private isReady = false;
    private isLogged = false;
    private kient!: Kient;

    public async init() {
        this.kient = await Kient.create();

        logger.info(`[KickAPI] ...`);
    }

    public async auth(login: string, password: string, totp: string) {
        this._checkReady();

        // TODO: really check it
        this.isLogged = true;

        return await this.kient.api.authentication.login({
            email: login,
            password: password,
            otc: totp,
        });
    }

    public async pullKickStreamers(channelNames): Promise<OnlineStream[]> {
        this._checkReady();

        const online: OnlineStream[] = [];
        for (const channelName of channelNames) {
            const response = await this.kient.api.channel.getChannel(channelName);
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

    private _checkReady() {
        if (!this.isReady) {
            throw Error('Kick: not initialized');
        }
    }
}
