import { ApplicationCommandType } from "discord.js";
import { ctx } from "../ctx";

/** @type {import("discord.js").ApplicationCommandData} */
export const data = {
    name: "join",
    description: "Join the leaderboards",
    type: ApplicationCommandType.ChatInput,
};

/**
 * @param {import("discord.js").ChatInputCommandInteraction} command
 * @returns {Promise<void>}
 */
export async function run(command) {
    await command.reply({
        content:
            `Join general leaderboard with: \`ttlic_${ctx.data.leaderboardInvite}\`\n` +
            `Allow more data as a friend: \`ttfc_${ctx.data.friendCode}\``,
        ephemeral: false,
    });
}
