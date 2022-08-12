import { ActionRowBuilder, ApplicationCommandType, ButtonBuilder, ButtonStyle } from "discord.js";
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
    const leaderboardButton = new ButtonBuilder()
        .setStyle(ButtonStyle.Link)
        .setURL(`https://testaustime.fi/leaderboards?code=ttlic_${ctx.data.leaderboardInvite}`)
        .setLabel("General leaderboards");

    const friendButton = new ButtonBuilder()
        .setStyle(ButtonStyle.Link)
        .setURL(`https://testaustime.fi/friends?code=ttfc_${ctx.data.friendCode}`)
        .setLabel("More data as friend");

    const row =
        /** @type {import("discord.js").ActionRowBuilder<import("discord.js").ButtonBuilder>} */ (
            new ActionRowBuilder()
        ).addComponents(leaderboardButton, friendButton);

    await command.reply({
        content: "Use these buttons to allow me to use your Testaustime data",
        components: [row],
        ephemeral: false,
    });
}
