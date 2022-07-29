import { Client } from "discord.js";
import { readdir } from "fs/promises";
import { config } from "../config";

const guildId = process.argv[2];

const client = new Client({
    intents: [],
});

client.login(config.discordToken).catch((e) => {
    console.error(e);
    client.destroy();
    process.exit();
});

// TODO: automatic deployment which compares existing commands to files and modifies them accordingly

client.on("ready", async () => {
    try {
        const cmdFiles = await readdir("./src/commands");

        const commands = (
            await Promise.all(
                cmdFiles.map(async (file) => {
                    const commandName = file.split(".")[0];
                    try {
                        const command = await import(`../commands/${file}`);
                        if (!command?.data) throw new Error("Command doesn't have data.");
                        return command.data;
                    } catch (e) {
                        console.error(
                            `Failed deploying command "${commandName}" because "${e.message}"`
                        );
                        return null;
                    }
                })
            )
        ).filter(Boolean);

        const target = guildId ? await client.guilds.fetch(guildId) : client.application;
        if (!target) throw new Error("Target not found.");
        await target.commands.set(commands);
        console.log("Deployed commands!");
    } catch (e) {
        console.error(e);
    } finally {
        client.destroy();
        process.exit();
    }
});
