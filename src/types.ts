export type Channel = {
    name: string;
    photoLive?: string;
    photoOff?: string;
}

export type Channels = {
    [key: string]: Channel;
}

export type OnlineStream = {
    title: string;
    name: string;
    game: string;
    duration: string;
    hours: number;
}

export type Notification = {
    message: string;
    photo?: string;
    trigger?: string;
}

export enum EventType {
    live = 'photoLive',
    off = 'photoOff',
}
