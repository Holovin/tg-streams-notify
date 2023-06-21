export function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}



export function getArrDiff<T>(arr1: T[], arr2: T[]): T[] {
    return arr1.filter(x => !arr2.some(y => x === y));
}

export function sleepBlock(seconds: number) {
    sleepBlockMs(seconds * 1000);
}

export function sleepBlockMs(ms: number) {
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}
