import { TextChannel } from "discord.js";
import { readFile } from "node:fs/promises";
import { config } from "../config";
import { ctx } from "../ctx";

/**
 * @return {Promise<void>}
 */
export default async function ready() {
    console.log(`Ready and logged in as ${ctx.client.user?.tag}!`);

    if (process.env.NODE_ENV === "production") {
        const revision = await readFile("./revision", "utf-8").catch(() => "unknown");
        const ch = await ctx.client.channels.fetch(config.statusChannel);
        if (!(ch instanceof TextChannel)) throw new Error("Status channel is not a text channel");
        await ch.send(`Testaustime bot online! \`${revision}\``).catch(() => null);
    }
}
