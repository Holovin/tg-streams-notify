## Version history
##### v16
- feat: recorder (beta & unstable)
- fix: crash when `/get_pin` called (missed this context)
- fix: reset current state after `/get_pin` (to force pin message update)
- fix: `/get_pin` was unprotected (now only for admin)
- fix: rare crashes with undefined duration values
- DX: move project to ESM
- b/fix: rename pm2 ecosystem file for ESM support
- c/feat: `/get_re` return active streams & free space
- c/fix: remove ended streams properly
- e/DX: normalize stream login property for prevent future comparison errors
- e/fix: auto-message frequency fixes
- 7/fix: fix stop command, add exit code output
- 8/DX: move all text of messages to functions for prevent md errors
- 8/fix: fix empty recorder config error
- 9+10/fix: fix typo in tgmsg
- 11/fix: no escape-md in pin method for stream title
- 12+13/feat: pin force update command

##### v15
- feat: remove kick support (there is no official API, unofficial too much buggy)
- feat: notifications on game change
- feat: change notifications text format
- fix: crash when db twitch ban value was empty
- DX: ts-node for nice stacktrace, `env` config property for disabling telegram stacktrace messages

##### v14
- kick support
- massive code refactoring

##### v13
- fix formatting changes

##### v12
- /get_pin command & functionality

##### v11
- displayName new config property
- ban check support
- sqlite for store state

##### v10
- logging to file and tg
- update notification text formatting

##### v9
- fix readme

##### v8
- fixed bug with wrong index in array when 2 events occur at same time

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
