import { PayloadMap } from '../../processor';
import { Logger } from 'winston';
import { Twitch } from '../../twitch';

export type PayloadMapType = keyof PayloadMap;

export interface PreTask<T extends PayloadMapType> {
    type: T;
    payload: PayloadMap[T];
    self?: SelfData
}

export interface Task<T extends PayloadMapType> extends PreTask<T> {
    id: number;
    runAfter: number;
}

export interface SelfData {
    db: any;
    // logger: Logger;
    // twitch: Twitch;

}

export interface RunFunctionInterface {
    (payload: {}): Promise<unknown>,
}
