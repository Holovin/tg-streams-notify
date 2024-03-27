# SQD StreamNotify
Telegram bot that can send notifications of current twitch streams to telegram chat. 

## Setup & running
1. Tested on NodeJS v18-20
1. Create `config.json` in project root folder
```
{
  "env": "DEV",
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

| Config key                        | Description                                                                                                                                                                                                                                                                                                                                                                                                                     |
|-----------------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `telegram:admin`                  | admin user ID (used for start messages)                                                                                                                                                                                                                                                                                                                                                                                         |
| `telegram:chat`                   | chat ID for sending messages                                                                                                                                                                                                                                                                                                                                                                                                    |
| `telegram:token`                  | bot token from @BotFather                                                                                                                                                                                                                                                                                                                                                                                                       |
| `twitch:id` <br/> `twitch:secret` | from https://dev.twitch.tv/console/apps/create                                                                                                                                                                                                                                                                                                                                                                                  |
| `twitch:channels`                 | list of channels (max 100), key = twitch name (like demouser = twitch.tv/demouser). <br/> Properties `photoLive`, `photoOff`, `banned`, `unbanned` are used as photos for these events. You should upload photos before and put telegram `file_id`'s in properties (see: https://core.telegram.org/bots/api#sending-files). If these properties not specified bot will try to use default values or send message without image. |
| `defaultChannelValues`            | default telegram `file_id` values for images for some event messages (not required, in previous versions this config section was as `_` user)                                                                                                                                                                                                                                                                                   |
| `timeout`                         | minimal amount of seconds between API calls                                                                                                                                                                                                                                                                                                                                                                                     |
| `heartbeat`                       | [optional] url for healthcheck (app will HTTP/GET this url every check iteration (~timeout)                                                                                                                                                                                                                                                                                                                                     |
| `env`                             | set `DEV` for output any errors only to console. Otherwise unhandled errors will be sended to tg admin chat                                                                                                                                                                                                                                                                                                                     | 

2. `npm install`
3. `pm2 start ecosystem.config.cjs` (see: https://pm2.keymetrics.io/docs/usage/quick-start)
