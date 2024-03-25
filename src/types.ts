export type Channel = {
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

export type OnlineStream = {
    title: string;
    name: string;
    game: string;
    duration: string;
    hours: number;
    platform: PlatformType;
}

export type Notification = {
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

export type UserInfo = {
    name: string,
    displayName: string
}
