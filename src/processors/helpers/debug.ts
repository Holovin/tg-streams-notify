export type TaskDebugParamsType = {
    foo: any;
    bar: any;
}

export function debug({ foo, bar }: TaskDebugParamsType) {
    console.log('>>> DEBUG OK <<< >>> ', foo, bar, ' ---- ');
    return true;
}
