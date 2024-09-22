const { debug, webhook_url, realm_code, relay_settings, modules } = require("./config.json");
const { WebhookClient, EmbedBuilder } = require("discord.js");
const bedrock = require("bedrock-protocol");
const title = "Chat-Relay-Bot";
const devices = { 0: "Unknown", 1: "Android", 2: "IOS", 3: "MacOS", 4: "FireOS", 5: "GearVR", 6: "Hololens", 7: "Windows", 8: "Windows", 9: "Dedicated Server", 11: "Playstation", 12: "Nintendo Switch", 13: "Xbox", 14: "Windows", 15: "Linux" };

class Client {
    constructor(debug, webhook, code, settings, modules) {
        this.debug = debug;
        this.webhook = webhook;
        this.realm_code = code;
        this.settings = settings;
        this.modules = modules;
        this.client = null;
        this.player_map = [];
        this.startup();
    }

    async startup() {
        if (!this.realm_code) throw new Error("[Error]  >  realm_code value in config.json is empty.");
        if (!this.webhook) throw new Error("[Error]  >  webhook_url value in config.json is empty.");
        if (this.debug) console.log(`[Debug] [${title}] >  Building client...`);
        this.client = await buildBot();
        await this.relay();
    }

    async buildBot() {
        return new Promise((resolve, reject) => {
            try {
                const b = bedrock.createClient({
                    offline: false,
                    realms: {
                        realmInvite: this.realm_code
                    }
                });
                if (this.debug) console.log(`[Debug] [${title}]  >  Client built, joining ${this.realm_code}...`);
                resolve(b);
            } catch (e) {
                reject(e);
            }
        });
    }

    async relay() {
        this.client.on("play_status", (packet) => {
            if (packet.status === "player_spawn") console.log(`[${title}]  >  Client connected to ${this.realm_code}!`);
        });

        this.client.on("player_list", async (packet) => {
            switch (packet.records.type) {
                case "add":
                    for (const player of packet.records.records) {
                        const username = player.username;
                        if (username === this.client.profile.name) return;
                        const uuid = player.uuid;
                        const xuid = player.xbox_user_id;
                        if (!xuid) return sendCommand(`kick "${username}" bye`, 2, 0, "", "", false, this.client);
                        const device = devices[device];
                        if (modules.device_filter[device]) sendCommand(`kick "${username}" Blocked Device.`, 2, 0, "", "", false, this.client);
                        if (this.settings.joins) await sendJoin(this.webhook, username, xuid, device);
                        updateMap(this.player_map, "add", { username: username, uuid: uuid, xuid: xuid, device: device, joined: new Date.toISOString() }, uuid);
                        console.log(`[+] [${new Date.toISOString()}] [${title}]  >  ${username} (${xuid}) joined on ${device}.`);
                    }
                    break;
                case "remove":
                    for (const player of packet.records.records) {
                        const uuid = player.uuid;
                        const model = this.player_map.find(p => p.uuid === uuid);
                        if (!model) return;
                        if (this.settings.leaves) await sendLeave(this.webhook, model.username, model.xuid, model.device);
                        console.log(`[-] [${new Date.toISOString()}] [${title}]  >  ${username} (${model.xuid}) left. They were on ${model.device}.`);
                        updateMap(this.player_map, "remove", model, uuid);
                    }
                    break;
            }
        });

        this.client.on("text", async (packet) => {
            if (packet.type === "chat") {
                const model = this.player_map.find(p => p.xuid === packet.xuid);
                if (this.modules.anti_spam && packet.message.startsWith("* External")) sendCommand(`kick "${model.username}" Spam Detected.`, 2, 0, "", "", false, this.client);
                if (packet.message.length > 400) return;
                if (this.settings.messages) await sendMessage(this.webhook, model.username, packet.message);
                if (this.debug) console.log(`[Debug] [${title}]  >  ${new Date.toISOString()} | ${username}: ${message}`);
            }
        });

        this.client.on("error", () => {});
    }
}

function updateMap(map, type, model, uuid) {
    if (type === "add") {
        if (map.find(p => p.uuid === uuid)) map.splice(map.indexOf(model), 1);
        map.push(model);
    } else if (type === "remove") {
        if (map.find(p => p.uuid === uuid)) map.splice(map.indexOf(model), 1);
    }
}

function sendCommand(command, version, type, uuid, requestId, internal, client) {
    client.write("command_request", {
        command: command,
        version: version,
        origin: {
            type: type,
            uuid: uuid,
            request_id: requestId
        },
        internal: internal
    });
}

async function sendMessage(webhook, username, message) {
    const embed = new EmbedBuilder()
        .setColor("NotQuiteBlack")
        .setDescription(`**${username}**: ${message}`)
        .setTimestamp();

    const web = new WebhookClient({ url: webhook });
    web.send({ embeds: embed });
}

async function sendJoin(webhook, username, xuid, device) {
    const embed = new EmbedBuilder()
        .setColor("Green")
        .setDescription(`**${username}** just joined the realm.`)
        .setFooter(`Device: ${device}, XUID: ${xuid}`)
        .setTimestamp();

    const web = new WebhookClient({ url: webhook });
    web.send({ embeds: embed });
}

async function sendLeave(webhook, username, xuid, device) {
    const embed = new EmbedBuilder()
        .setColor("Red")
        .setDescription(`**${username}** just left the realm.`)
        .setFooter(`Device: ${device}, XUID: ${xuid}`)
        .setTimestamp();

    const web = new WebhookClient({ url: webhook });
    web.send({ embeds: embed });
}

new Client(debug, webhook_url, realm_code, relay_settings, modules);