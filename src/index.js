import { readdir } from "node:fs/promises";
import { ActivityType, Client, GatewayIntentBits } from "discord.js";
import { Testaustime } from "./lib/Testaustime";
import { ctx } from "./ctx";
import { config } from "./config";

console.log("Starting Testaustime client...");

const testaustime = new Testaustime();
await testaustime.login(config.testaustime.username, config.testaustime.password);
ctx.testaustime = testaustime;
ctx.data.leaderboardInvite = (
    await testaustime.getLeaderboard(config.testaustime.leaderboard)
).invite;
const botUser = await testaustime.getMe();
ctx.data.friendCode = botUser.friend_code;
ctx.data.botName = botUser.username;

console.log("Testaustime client started");

console.log("Starting Discord client...");

const client = new Client({
    intents: [GatewayIntentBits.Guilds],
    presence: {
        status: "online",
        activities: [
            {
                name: "you code",
                type: ActivityType.Playing,
            },
        ],
    },
});
client.login(config.discordToken);
ctx.client = client;

console.log("Discord client started");

console.log("Loading events...");

const eventFiles = await readdir("./src/events");
await Promise.all(
    eventFiles.map(async (file) => {
        const eventName = file.split(".")[0];
        const event = (await import(`./events/${file}`)).default;
        client.on(eventName, event);
    })
);

console.log("Events loaded");

console.log("Loading commands...");

const commandFiles = await readdir("./src/commands");
await Promise.all(
    commandFiles.map(async (file) => {
        const commandName = file.split(".")[0];
        const command = await import(`./commands/${file}`);
        ctx.commands.set(commandName, command);
    })
);

console.log("Commands loaded");

console.log("Loading buttons...");

const buttonFiles = await readdir("./src/buttons");
await Promise.all(
    buttonFiles.map(async (file) => {
        const buttonName = file.split(".")[0];
        const button = await import(`./buttons/${file}`);
        ctx.buttons.set(buttonName, button);
    })
);

console.log("Commands loaded");
