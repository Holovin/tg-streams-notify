import { BaseClass } from './baseClass';
import { PayloadMap } from '../../processor';


export type TaskDebugClass = {
    foo: string;
}


export class DebugClass extends BaseClass {
    // public constructor(payload: PayloadMap) {
    //     super({}, {} as any);
    //     this.logger.info('Test!');
    // }

    public async run() {
        this.logger.info('Run!');
        return Promise.resolve(undefined);
    }
}
