import { Logger } from 'winston';
import { Logger2 } from '../../logger2';
import { SelfData } from './types';


export interface BaseClassConstructor extends Function {
    new (payload: {}, self: SelfData): BaseClass;
}

export class BaseClass implements BaseClassInterface {
    protected readonly logger: Logger;
    protected self: SelfData;
    protected payload: {};

    public constructor(payload: {}, self: SelfData) {
        this.logger = Logger2.getInstance().getLogger(this.constructor.name);

        this.self = self;
        this.payload = payload;

        this.logger.debug(`payload = ${JSON.stringify(payload)}, self = ${JSON.stringify(self)}`);
    }

    public run(): Promise<any> {
        return Promise.resolve();
    }
}

export interface BaseClassInterface {
    run(): Promise<any>
}
