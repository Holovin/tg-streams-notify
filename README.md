# SQD StreamNotify
Telegram bot that can send notifications of current twitch streams to telegram chat. 

## Setup & running
1. Tested on NodeJS v18
1. Create `config.json` in project root folder
```
{
  "stand": "debug",
  "telegram": {
    "admin": 1,
    "chat": 2,
    "token": "123456789:TELEGRAM_TOKEN_STR"
  },
  "twitch": {
    "id": "APP_ID",
    "secret": "APP_SECRET",
    "channels": {
      "demo_user": {
        "photoLive": "TG_PHOTO_ID_STRING",
        "photoOff": "TG_PHOTO_ID_STRING"
      },

      "demo_user_second": {},
    },
  },
  "kick": {
    "channels": {
      "demo_user": {
        "photoLive": "TG_PHOTO_ID_STRING",
        "photoOff": "TG_PHOTO_ID_STRING"
      },

      "demo_user_second": {},
    },
  },
  "defaultChannelValues": {
    "displayName": "DEFAULT VALUE FOR ANY STREAM",
    "photoLive": "TG_PHOTO_ID_STRING",
    "photoOff": "TG_PHOTO_ID_STRING",
    "banned": "TG_PHOTO_ID_STRING",
    "unbanned": "TG_PHOTO_ID_STRING"
  },
  "timeout": 60
  "heartbeat": "....../api/....."
}
```

Example of config, values:

| Config key                        | Description                                                                                                                                                                                                                                                                                                                                                                                         |
|-----------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `telegram:admin`                  | admin user ID (used for start messages)                                                                                                                                                                                                                                                                                                                                                             |
| `telegram:chat`                   | chat ID for sending messages                                                                                                                                                                                                                                                                                                                                                                        |
| `telegram:token`                  | bot token from @BotFather                                                                                                                                                                                                                                                                                                                                                                           |
| `twitch:id` <br/> `twitch:secret` | from https://dev.twitch.tv/console/apps/create                                                                                                                                                                                                                                                                                                                                                      |
| `twitch:channels`                 | list of channels (max 100), key = twitch name (like demouser = twitch.tv/demouser). `photoLive` and `photoOff` properties are telegram `file_id` (see: https://core.telegram.org/bots/api#sending-files). If these properties specified bot will send this photo with start/end stream message. Key `"_"` is reserved (see example above) and used as fallback if user don't have these properties. |
| `kick:channels`                   | list of channels (no limit), key = kick name (like demouser = kick.com/demouser). Other values same as above for twitch                                                                                                                                                                                                                                                                             | |
| `timeout`                         | minimal amount of seconds between API calls                                                                                                                                                                                                                                                                                                                                                         |
| `heartbeat`                       | [optional] url for healthcheck (app will HTTP/GET this url every check iteration (~timeout)                                                                                                                                                                                                                                                                                                         |

2. `npm install`
3. `pm2 start ecosystem.config.js` (see: https://pm2.keymetrics.io/docs/usage/quick-start)
