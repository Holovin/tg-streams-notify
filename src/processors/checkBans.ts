// async function taskCheckBans(db: Keyv): Promise<void> {
//     const usersSaved: string[] = JSON.parse(await db.get(DB_USERS));
//     const usersFresh = await pullUsers(twitch, channelNames, logger);
//     const usersFreshFlat = usersFresh.map(user => user.name);
//
//     const banned = getArrDiff<string>(usersSaved, usersFreshFlat);
//     const unbanned = getArrDiff<string>(usersFreshFlat, usersSaved);
//
//     const notifications: Notification[] = [];
//
//     logger.debug(`checkBans: banned -- ${JSON.stringify(banned)}`);
//     logger.debug(`checkBans: unbanned -- ${JSON.stringify(unbanned)}`);
//
//     banned.forEach(user => {
//         notifications.push({
//             message: `*${getChannelDisplayName(channels, user)}* is banned\\!`,
//             photo: getChannelPhoto(channels, null, EventType.banned),
//             trigger: 'banned (new)',
//         });
//     });
//
//     unbanned.forEach(user => {
//         notifications.push({
//             message: `*${getChannelDisplayName(channels, user)}* is unbanned\\!`,
//             photo: getChannelPhoto(channels, null, EventType.unbanned),
//             trigger: 'unbanned (new)',
//         });
//     });
//
//     await sendNotifications(bot, chatId, notifications, logger);
//
//     if (banned.length > 0 || unbanned.length > 0) {
//         await db.set(DB_USERS, JSON.stringify(usersFreshFlat));
//         logger.info(`checkBans: update DB done`);
//     }
// }
