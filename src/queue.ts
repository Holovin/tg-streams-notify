import { Logger } from 'winston';
import { Logger2 } from './logger2';
import { TaskType } from './processor';
import { Task, PreTask } from './processors/helpers/types';


class Queue {
    public static readonly LOG_TIMEOUT = 10 * 1000;

    private taskLastIndex = 0;
    private taskLastDate = 0;
    private tasks: Task<TaskType>[];
    private logger: Logger;

    public static getCurrentJsTs(): number {
        return new Date().getTime();
    }

    public static getJsTsAfterSeconds(seconds: number) {
        return Queue.getCurrentJsTs() + seconds * 1000;
    }

    public static getJsTsBeforeSeconds(seconds: number) {
        return Queue.getCurrentJsTs() - seconds * 1000;
    }

    constructor() {
        this.tasks = [];
        this.logger = Logger2.getInstance().getLogger('queue');
    }

    public add(preTask: PreTask<TaskType>, runAfter: number = 0) {
        this.taskLastIndex++;
        this.logger.debug(`add: id = ${this.taskLastIndex}, type = ${preTask.type}, at = ${runAfter}`);

        const task: Task<TaskType> = {
            id: this.taskLastIndex,
            type: preTask.type,
            runAfter: runAfter,
            self: preTask.self,
            payload: { ...preTask.payload } as any,
        }

        this.tasks.push(task);
        this.tasks = this.tasks.sort((one, two) => {
            return one.runAfter > two.runAfter ? 1 : -1;
        });

        this.logger.debug('add: tasks = ' + JSON.stringify(this.tasks));
        return true;
    }

    public getAndRemove(): Task<TaskType> | null {
        let index = -1;
        const currentTs = Queue.getCurrentJsTs();
        const task = this.tasks.find(((value, i) => {
            if (currentTs >= value.runAfter) {
                this.logger.debug(`getAndRemove: valid task, index = ${i}, diffTs = ${currentTs} >= ${value.runAfter}`);
                index = i;
                return true;
            }

            return false;
        }));

        if (!task) {
            const now = Queue.getCurrentJsTs();
            if (now - Queue.LOG_TIMEOUT > this.taskLastDate) {
                this.logger.debug(`getAndRemove: no tasks`);
                this.taskLastDate = Queue.getCurrentJsTs();
            }

            return null;
        }

        this.tasks.splice(index, 1);

        this.logger.debug(`getAndRemove: task = ${JSON.stringify(task)}`);
        return task;
    }

    public throttle(timeout = 1000) {
        const task: PreTask<TaskType.SLEEP> = {
            type: TaskType.SLEEP,
            payload: { ms: timeout },
        };

        return this.add(task);
    }

    public getSize(): number {
        return this.tasks.length;
    }

    public getTotalCompleted(): number {
        return this.taskLastIndex;
    }
}

export { Task, Queue }
