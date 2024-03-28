export interface Channel {
    name: string;
    photoLive?: string;
    photoOff?: string;
    displayName?: string;
}

export type Channels = {
    [key: string]: Channel;
}

export enum PlatformType {
    TWITCH
}

export interface OnlineStream {
    title: string;
    login: string;
    loginNormalized: string;
    game: string;
    duration: string;
    hours: number;
    platform: PlatformType;
}

export interface Notification {
    message: string;
    photo?: string;
    trigger?: string;
}

export enum EventType {
    live = 'photoLive',
    off = 'photoOff',
    banned = 'banned',
    unbanned = 'unbanned',
}

export const photoEventMap = {
    [EventType.off]: 'photoOff',
    [EventType.live]: 'photoLive',
    [EventType.banned]: 'banned',
    [EventType.unbanned]: 'unbanned',
}

export interface UserInfo {
    name: string,
    displayName: string
}
