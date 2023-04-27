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
      "_": {
        "photoLive": "TG_PHOTO_ID_STRING",
        "photoOff": "TG_PHOTO_ID_STRING"
      },

      "demo_user": {
        "photoLive": "TG_PHOTO_ID_STRING",
        "photoOff": "TG_PHOTO_ID_STRING"
      },

      "demo_user_second": {},
    },
    "timeout": 60
  },
  "heartbeat": "....../api/....."
}
```

Example of config, values:

| Config key                        | Description                                                                                                                                                                                                                                                                                                                                                                                         |
|-----------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `stand`                           | used in start message, handy in debug bot locally if you use same bot for dev and prod                                                                                                                                                                                                                                                                                                              |
| `telegram:admin`                  | admin user ID (used for start messages)                                                                                                                                                                                                                                                                                                                                                             |
| `telegram:chat`                   | chat ID for sending messages                                                                                                                                                                                                                                                                                                                                                                        |
| `telegram:token`                  | bot token from @BotFather                                                                                                                                                                                                                                                                                                                                                                           |
| `twitch:id` <br/> `twitch:secret` | from https://dev.twitch.tv/console/apps/create                                                                                                                                                                                                                                                                                                                                                      |
| `twitch:channels`                 | list of channels (max 100), key = twitch name (like demouser = twitch.tv/demouser). `photoLive` and `photoOff` properties are telegram `file_id` (see: https://core.telegram.org/bots/api#sending-files). If these properties specified bot will send this photo with start/end stream message. Key `"_"` is reserved (see example above) and used as fallback if user don't have these properties. |
| `timeout`                         | minimal amount of seconds between twitch API calls                                                                                                                                                                                                                                                                                                                                                  |
| `heartbeat`                       | [optional] url for healthcheck (app will HTTP/GET this url every check iteration (~timeout)                                                                                                                                                                                                                                                                                                         |

2. `npm install`
3. `pm2 start ecosystem.config.js` (see: https://pm2.keymetrics.io/docs/usage/quick-start)

## Version history
##### v7
- [config format changes]
- README added
- fixed bug with different cases in config file and twitch username response
- removed notification every hour

##### v6
- [config format changes]
- support for start/end stream photos
- send new notification every hour or if title changed

##### v5
- [config format changes]
- send messages with photo
- fixed empty response error
- fixed error if user had `_` in name

##### v4
- send every notification as single message
- changed message formatting

##### v3
- pm2 support

##### v2
- heartbeat URL support

##### v1
- initial release
