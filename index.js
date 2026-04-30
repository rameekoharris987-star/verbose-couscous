const mineflayer = require('mineflayer');
const fs = require('fs');
require('./keep_alive');

let rawdata = fs.readFileSync('config.json');
let data = JSON.parse(rawdata);

const host = data["ip"];
const port = parseInt(data["port"]);
const username = data["name"];
const version = data["version"];

const actions = ['forward', 'back', 'left', 'right'];
const moveinterval = 2;
const maxrandom = 5;
const pi = 3.14159;
const reconnectDelayMs = 30000;

function createBot() {
    console.log(`Connecting to ${host}:${port} as ${username} (MC ${version})...`);

    const bot = mineflayer.createBot({
        host: host,
        port: port,
        username: username,
        version: version,
        auth: 'offline'
    });

    let lasttime = -1;
    let moving = 0;
    let connected = 0;
    let lastaction;

    bot.on('login', function () {
        console.log("Logged in to the server.");
    });

    bot.on('spawn', function () {
        connected = 1;
        console.log("Spawned. AFK routine started.");
    });

    bot.on('time', function () {
        if (connected < 1) return;
        if (lasttime < 0) {
            lasttime = bot.time.age;
        } else {
            const randomadd = Math.random() * maxrandom * 20;
            const interval = moveinterval * 20 + randomadd;
            if (bot.time.age - lasttime > interval) {
                if (moving == 1) {
                    bot.setControlState(lastaction, false);
                    moving = 0;
                    lasttime = bot.time.age;
                } else {
                    const yaw = Math.random() * pi - (0.5 * pi);
                    const pitch = Math.random() * pi - (0.5 * pi);
                    bot.look(yaw, pitch, false);
                    lastaction = actions[Math.floor(Math.random() * actions.length)];
                    bot.setControlState(lastaction, true);
                    moving = 1;
                    lasttime = bot.time.age;
                    bot.activateItem();
                }
            }
        }
    });

    bot.on('kicked', (reason) => {
        console.log("Kicked:", reason);
    });

    bot.on('error', (err) => {
        console.log("Error:", err.code || err.message);
    });

    bot.on('end', (reason) => {
        console.log(`Disconnected (${reason}). Reconnecting in ${reconnectDelayMs / 1000}s...`);
        setTimeout(createBot, reconnectDelayMs);
    });
}

createBot();
