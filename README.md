### Chat-Relay-Bot

# Setup
1. Clone or Download this repository.
2. Make sure you have [NodeJS](https://nodejs.org/en/download) installed.
3. Create a webhook on discord in the channel you want logs sent to.
4. Fill in `webhook_url` and `realm_code` config.json values.
5. Run `node .` in the terminal.


* Blocks External Messages ✅
* Block Specific Devices from Joining ✅
* Discord -> Minecraft Relay ❌
* Minecraft -> Discord Relay ✅
* Logs Joins/Leaves ✅
* Shows Device on Join ✅

# Config Options
* `debug`: logs more info on certain events.
* `relay_settings`: choose which logs are/aren't sent
* `anti_spam`: block regular spam
* `device_filter`: block certain devices from joining