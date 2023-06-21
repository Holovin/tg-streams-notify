import { Logger } from 'winston';
import { Logger2 } from './logger2';
import { TaskSleepParamsType, sleep } from './processors/sleep';
import { TaskHeartBeatType } from './processors/heartbeat';
import { RunFunctionInterface, Task } from './processors/helpers/types';
import { debug, TaskDebugParamsType } from './processors/helpers/debug';
import { DebugClass, TaskDebugClass } from './processors/helpers/debugClass';
import { BaseClass, BaseClassConstructor } from './processors/helpers/baseClass';


export enum TaskType {
    DEBUG = 'DEBUG',
    DEBUG_CL = 'DEBUG_CL',
    SLEEP = 'SLEEP',
    HEARTBEAT = 'HEARTBEAT',
    // CHECK_ONLINE = 'CHECK_ONLINE',
    // CHECK_BANS = 'CHECK_BANS',
    // POST_PROCESS = 'POST_PROCESS',
    // SEND_NOTIFICATIONS = 'SEND_NOTIFICATIONS',
    // UPDATE_PIN = 'UPDATE_PIN',
}

export type PayloadMap = {
    [TaskType.DEBUG]: TaskDebugParamsType;
    [TaskType.SLEEP]: TaskSleepParamsType;
    [TaskType.HEARTBEAT]: TaskHeartBeatType;
    [TaskType.DEBUG_CL]: TaskDebugClass;
}



export class Processor {
    private static TASK_MAP = {
        [TaskType.SLEEP]: sleep,
        [TaskType.DEBUG]: debug,
        [TaskType.DEBUG_CL]: DebugClass,
    }

    private logger: Logger;

    public constructor() {
        this.logger = Logger2.getInstance().getLogger('processor');
    }

    public async run(task: Task<TaskType>): Promise<boolean> {
        const fn = Processor.TASK_MAP[task.type];
        let name = fn['name'];

        if (!name) {
            this.logger.error(`run: wrong processor name ${task.type} (id = ${task.id}}`);
            return false;
        }

        if (!fn) {
            this.logger.error(`run: empty processor function for name ${task.type} (id = ${task.id}}`);
            return false;
        }

        this.logger.debug(`run: find function for processor id = ${task.id}, f_name = ${name}`);

        if (task.self) {
            const _ = new (fn as typeof BaseClass)({}, task.self);
            await _.run();

        } else {
            await (fn as RunFunctionInterface)(task.payload);
        }

        this.logger.debug(`run: end id = ${task.id}, f_name = ${name}`);
        return true;
    }
}
