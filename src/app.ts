import nconf from 'nconf';
import axios from 'axios';
import { sleep } from './helpers';
import { Channels, OnlineStream, USER_RESERVED } from './types';
import { Db } from './db';
import { Twitch } from './twitch';
import { Telegram } from './telegram';
import { Logger2 } from './logger2';
import { Logger } from 'winston';
import { Queue } from './queue';
import { Processor, TaskType } from './processor';
import { PreTask, Task } from './processors/helpers/types';

export type AppConfig = {
    telegram: {
        token: string;
        chatId: number;
        adminId: number;
    };

    twitch: {
        id: string;
        secret: string;
    }

    timeout: number;
    heartbeatUrl: string;

}

export class App {
    public static readonly QUEUE_TIMEOUT_MS = 20;

    private config = nconf.env().file({ file: 'config.json' });

    private channels: Channels = { };
    private channelNames: string[] = [];
    private appConfig!: AppConfig;


    private readonly bot: Telegram;
    private readonly twitch: Twitch;
    private readonly logger: Logger;
    private readonly db: Db;
    private readonly tasks: Queue;
    private readonly processor: Processor;

    private state: OnlineStream[] = [];

    private tickCount = 0;
    private tickActive = true;


    public constructor() {
        this.readConfig();
        this.convertChannelsConfig();

        Logger2.setup(this.appConfig.telegram.token, this.appConfig.telegram.adminId);
        this.logger = Logger2.getInstance().getLogger('app');

        this.twitch = new Twitch(this.appConfig.twitch.id, this.appConfig.twitch.secret);
        this.bot = new Telegram(this.appConfig.telegram.token);

        this.db = new Db(this.channelNames);
        this.processor = new Processor();
        this.tasks = new Queue();
    }

    public async init() {
        await this.initDb();

        const task: PreTask<TaskType.SLEEP> = {
            type: TaskType.SLEEP,
            payload: { ms: 10000 },
        };

        const task2: PreTask<TaskType.DEBUG> = {
            type: TaskType.DEBUG,
            payload: { foo: '123', bar: 123 },
        };

        const task3: PreTask<TaskType.DEBUG_CL> = {
            type: TaskType.DEBUG_CL,
            payload: { foo: '123' },
            self: { db: 123 },
        };


        this.tasks.add(task, 0);
        this.tasks.add(task2, 5000);
        this.tasks.add(task3, 0);
    }

    public async run() {
        // TODO: this.bot.start();
        // TODO: task add

        this.tick().then();
    }

    private async tick() {
        this.tickCount++;

        while (this.tickActive) {
            await this.processAvailableTask();
            await sleep(App.QUEUE_TIMEOUT_MS);
        }

        // // TODO: check timer!!!
        // await this.heartbeat();
        //
        // // this.logger.debug( `tick: task 0/2, (${new Date()}), state: ${state.length} / ${JSON.stringify(state)}`);
        // this.state = await this.taskCheckOnline();
        //
        // // logger.debug( `tick: task 1/2, (${new Date()}), state: ${state.length} / ${JSON.stringify(state)}`);
        // await sleep(timeout);

//         await taskCheckBans(db);
//         logger.debug( `tick: task 2/2, (${new Date()})`);
//
//         await sleep(timeout);
    }

    private async processAvailableTask() {
        const task = this.tasks.getAndRemove();
        if (!task) {
            // if (Math.random() > 0.95) {
            //     this.logger.silly(`processAvailableTask: no tasks (tick: ${this.tickCount})`);
            // }
            return;
        }

        try {
            this.logger.silly(`processAvailableTask: find task = ${JSON.stringify(task)} (tick: ${this.tickCount})`);

            const result = await this.runTask(task);
            if (!result) {
                const msg = `processAvailableTask: task ${task.type} (id = ${task.id}) failed! (tick: ${this.tickCount})`;
                this.logger.warn(msg);
            }

            this.logger.debug(`processAvailableTask: task = ${task.id} OK DONE... (tick: ${this.tickCount})`);
        } catch (e) {
            if (e instanceof Error) {
                const msg = `processAvailableTask: task = ${task.id}\n CRASHED: ${e.message}\n STACK:\n${e.stack}`;
                this.logger.error(msg);
            }
        }
    }

    private async runTask(task: Task<TaskType>): Promise<boolean> {
        this.logger.debug(`runTask: task = ${JSON.stringify(task)}`);
        return this.processor.run(task);
    }



    ///



    private readConfig() {
        this.appConfig = {
            telegram: {
                token: this.config.get('telegram:token') as string,
                chatId: this.config.get('telegram:chat') as number,
                adminId: this.config.get('telegram:admin') as number,
            },

            twitch: {
                id: this.config.get('twitch:id') as string,
                secret: this.config.get('twitch:secret') as string,
            },

            timeout: this.config.get('twitch:timeout') as number,
            heartbeatUrl: this.config.get('heartbeat') as string,
        };
    }

    private convertChannelsConfig() {
        this.channels = Object.fromEntries(
            Object.entries(this.config.get('twitch:channels') as Channels)
                // Normalize channel names from config
                .map(([k, v], i) => [k.toLowerCase(), v]))
        ;

        this.channelNames = Object.keys(this.channels).filter(name => name !== USER_RESERVED);
    }

    private postLog() {
        this.logger.info(
            `== SQD StreamNotify config ==\n` +
            `Started, settings:\n` +
            `- channels: ${JSON.stringify(this.channelNames)}\n` +
            `- chatId: ${this.appConfig.telegram.chatId}\n` +
            `- adminId: ${this.appConfig.telegram.adminId}\n` +
            `- timeout: ${this.appConfig.timeout}\n` +
            `- heartbeat: ${this.appConfig.heartbeatUrl}\n`
        );
    }

    private async initDb() {
        await this.db.init();
    }

    private async heartbeat() {
        this.logger.debug( `tick: heartbeat...`);
        return await axios.get(this.appConfig.heartbeatUrl);
    }

    private getChannelDisplayName(user: string): string {
        return this.channels[user]?.displayName ?? user;
    }


}
