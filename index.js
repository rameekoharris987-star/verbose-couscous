const mineflayer = require('mineflayer');
const fs = require('fs');
require('./keep_alive');

let rawdata = fs.readFileSync('config.json');
let data = JSON.parse(rawdata);

const host = data["ip"];
const port = parseInt(data["port"]);
const username = data["name"];
const version = data["version"];

const actions = ['forward', 'back', 'left', 'right', 'jump'];
const moveinterval = 0.5;
const maxrandom = 0.5;
const moveDurationMs = 750;
const pi = 3.14159;
const reconnectDelayMs = 30000;

// Chat messages sent periodically to signal activity
const chatMessages = [
    'hello',
    'hi',
    ':)',
    'hey',
    'sup',
];

// How often (in ms) to rotate the bot's head independently of movement
const lookIntervalMs = 3000;

// How often (in ms) to send a chat message
const chatIntervalMs = 5 * 60 * 1000; // every 5 minutes

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
    let lookTimer = null;
    let chatTimer = null;

    function stopTimers() {
        if (lookTimer) { clearInterval(lookTimer); lookTimer = null; }
        if (chatTimer) { clearInterval(chatTimer); chatTimer = null; }
    }

    function startTimers() {
        stopTimers();

        // Frequent, varied head rotation to signal activity
        lookTimer = setInterval(() => {
            if (connected < 1) return;
            const yaw   = Math.random() * 2 * pi;
            const pitch = (Math.random() * pi * 0.75) - (pi * 0.375);
            bot.look(yaw, pitch, false);
        }, lookIntervalMs);

        // Periodic chat messages
        chatTimer = setInterval(() => {
            if (connected < 1) return;
            const msg = chatMessages[Math.floor(Math.random() * chatMessages.length)];
            try { bot.chat(msg); } catch (_) {}
        }, chatIntervalMs);
    }

    bot.on('login', function () {
        console.log("Logged in to the server.");
    });

    bot.on('spawn', function () {
        connected = 1;
        console.log("Spawned. AFK routine started.");
        startTimers();
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
                    // Stop the current movement control state (jump resets itself, but clear it anyway)
                    if (lastaction !== 'jump') {
                        bot.setControlState(lastaction, false);
                    }
                    moving = 0;
                    lasttime = bot.time.age;
                } else {
                    lastaction = actions[Math.floor(Math.random() * actions.length)];

                    if (lastaction === 'jump') {
                        // Jump is momentary — press, hold briefly, release
                        bot.setControlState('jump', true);
                        setTimeout(() => {
                            try { bot.setControlState('jump', false); } catch (_) {}
                        }, moveDurationMs);
                    } else {
                        bot.setControlState(lastaction, true);
                        // Hold the movement key for moveDurationMs then release
                        setTimeout(() => {
                            try { bot.setControlState(lastaction, false); } catch (_) {}
                        }, moveDurationMs);
                        // Occasionally interact with whatever is in hand
                        if (Math.random() < 0.3) {
                            try { bot.activateItem(); } catch (_) {}
                        }
                        // Occasionally swing the arm / attack to show activity
                        if (Math.random() < 0.2) {
                            try { bot.swingArm(); } catch (_) {}
                        }
                    }

                    moving = 1;
                    lasttime = bot.time.age;
                }
            }
        }
    });

    bot.on('kicked', (reason) => {
        console.log("Kicked:", reason);
        connected = 0;
        stopTimers();
    });

    bot.on('error', (err) => {
        console.log("Error:", err.code || err.message);
    });

    bot.on('end', (reason) => {
        connected = 0;
        stopTimers();
        console.log(`Disconnected (${reason}). Reconnecting in ${reconnectDelayMs / 1000}s...`);
        setTimeout(createBot, reconnectDelayMs);
    });
}

createBot();
