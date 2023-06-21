// import { getChannelPhoto, getShortStatus, getStatus } from '../text';
// import { EventType, Notification, OnlineStream } from '../types';
//
//
// export async function taskCheckOnline(state: OnlineStream[]): Promise<OnlineStream[]> {
//     const online = await this.twitch.pullStreamers(this.channelNames);
//     if (online === null) {
//         return state;
//     }
//
//     const data = postProcess(state, online);
//     if (data.notifications.length > 0) {
//         await this.bot.sendNotifications(this.appConfig.telegram.chatId, data.notifications);
//
//         const msgID = 0; // await db.get(getChatIdKey(chatId));
//         if (msgID) {
//             const isDone = await this.bot.updatePin(
//                 this.appConfig.telegram.chatId,
//                 msgID,
//                 getShortStatus(online)
//             );
//             if (!isDone) {
//                 // await db.delete(getChatIdKey(chatId));
//                 this.logger.info(
//                     `checkOnline: chatID = ${this.appConfig.telegram.chatId} removed from DB`
//                 );
//             }
//         }
//     }
//
//     return data.state;
// }
//
// function postProcess(state: Onl online: OnlineStream[]): {
//     notifications: Notification[],
//         state: OnlineStream[],
// } {
//     const notifications: Notification[] = [];
//     const newState: OnlineStream[] = [];
//
//     // Check event: Start stream
//     online.forEach((onlineStream, index) => {
//         const streamState = this.state.find(item => item.name === onlineStream.name);
//
//         // No in DB, need notification
//         if (!streamState) {
//             notifications.push({
//                 message: getStatus(onlineStream, true),
//                 photo: getChannelPhoto(this.channels, onlineStream, EventType.live),
//                 trigger: `new stream ${onlineStream.name}, db dump: ${JSON.stringify(this.state)}`,
//             });
//             this.logger.info(`postProcess: notify ${onlineStream.name} (new)`);
//
//             newState.push(onlineStream);
//         }
//         // Exist in DB, update timers
//         else {
//             this.logger.debug(`postProcess: update ${onlineStream.name} stream`);
//             if (onlineStream.title !== streamState.title) {
//                 this.logger.info(`postProcess: notify ${onlineStream.name} (title), db index: ${index}`);
//                 notifications.push({
//                     message: getStatus(onlineStream, true),
//                     photo: getChannelPhoto(this.channels, onlineStream, EventType.live),
//                     trigger: `title update: ${onlineStream.title} !== ${streamState.title}`,
//                 });
//             }
//
//             newState.push(onlineStream);
//         }
//     });
//
//     // Check event: end stream
//     for (let i = this.state.length - 1; i >= 0; i--) {
//         const stream = this.state[i];
//         const find = online.find(onlineItem => onlineItem.name === stream.name);
//         if (find) {
//             continue;
//         }
//
//         this.logger.info(`postProcess: stream is dead -- ${stream.name}`);
//         notifications.push({
//             message: getStatus(stream, false),
//             photo: getChannelPhoto(this.channels, stream, EventType.off),
//             trigger: `notify ${stream.name} (dead)`,
//         });
//     }
//
//     this.logger.debug(`postProcess: return -- ${JSON.stringify(notifications)}`);
//     return {
//         notifications: notifications,
//         state: newState
//     };
// }
