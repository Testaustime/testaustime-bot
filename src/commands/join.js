import { ctx } from "../ctx";

/** @type {import("discord.js").ApplicationCommandData} */
export const data = {
    name: "join",
    description: "Join the leaderboards",
    type: "CHAT_INPUT",
};

/**
 * @param {import("discord.js").CommandInteraction} command
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
