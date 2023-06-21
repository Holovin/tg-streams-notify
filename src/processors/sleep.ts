export type TaskSleepParamsType = {
    ms: number;
}

export function sleep({ ms }: TaskSleepParamsType) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
