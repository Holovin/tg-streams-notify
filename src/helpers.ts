export function sleep(seconds: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, seconds * 1000));
}

export function getArrDiff<T>(arr1: T[], arr2: T[]): T[] {
    return arr1.filter(x => !arr2.some(y => x === y));
}
