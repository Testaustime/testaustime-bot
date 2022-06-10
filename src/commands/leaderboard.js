import { MessageActionRow, MessageButton, MessageEmbed, Util } from "discord.js";
import { config } from "../config";
import { ctx } from "../ctx";
import { TimeUtil } from "../lib/TimeUtil";

/** @type {import("discord.js").ApplicationCommandData} */
export const data = {
    name: "leaderboard",
    description: "Show general leaderboard",
    type: "CHAT_INPUT",
};

/**
 * Update leaderboard cache if necessary
 * @returns {Promise<void>}
 */
export async function updateLeaderboardCache() {
    if (ctx.cache.lastUpdatedLeaderboard < Date.now() - 60 * 1000) {
        const res = /** @type {import("../lib/Testaustime").Leaderboard  | null} */ (
            await ctx.testaustime.getLeaderboard(config.testaustime.leaderboard).catch(() => null)
        );
        if (res) {
            ctx.cache.leaderboard = res.members.filter((u) => u.username !== ctx.data.botName);
            ctx.cache.lastUpdatedLeaderboard = Date.now();
        }
    }
}

/**
 * Test for data availability
 * @param {import("discord.js").CommandInteraction | import("discord.js").ButtonInteraction} interaction
 * @returns {Promise<boolean>}
 */
export async function leaderboardNotAvailable(interaction) {
    if (!ctx.cache.leaderboard.length) {
        await interaction.reply({
            content: "No data available, try again later.",
            ephemeral: true,
        });
        return true;
    }
    return false;
}

/**
 * Create the nth page of a leaderboard embed and necessary buttons for user
 * @param {string} user
 * @param {number} page
 * @returns {import("discord.js").InteractionReplyOptions}
 */
export function createLeaderboardMessage(user, page) {
    const PER_PAGE = 25;

    if (page >= Math.ceil(ctx.cache.leaderboard.length / PER_PAGE)) page = 0;

    const top = ctx.cache.leaderboard
        .sort((a, b) => b.time_coded - a.time_coded)
        .slice(page * PER_PAGE, (page + 1) * PER_PAGE);

    const embed = new MessageEmbed()
        .setTitle("Leaderboard (Past 7 days)"
        .setColor("AQUA")
        .setDescription(
            top
                .map(
                    (u, i) =>
                        `**${PER_PAGE * page + i}.** ${Util.escapeMarkdown(
                            u.username
                        )} - \`${TimeUtil.formatSecond(u.time_coded)}\``
                )
                .join("\n")
        )
        .setTimestamp();

    const backwards = new MessageButton()
        .setDisabled(page === 0)
        .setEmoji("◀️")
        .setStyle("PRIMARY")
        .setCustomId(`leaderboard.${user}.${page - 1}`);
    const forwards = new MessageButton()
        .setDisabled(ctx.cache.leaderboard.length <= PER_PAGE * (page + 1))
        .setEmoji("▶️")
        .setStyle("PRIMARY")
        .setCustomId(`leaderboard.${user}.${page + 1}`);
    const row = new MessageActionRow().addComponents(backwards, forwards);

    return { embeds: [embed], components: [row] };
}

/**
 * @param {import("discord.js").CommandInteraction} command
 * @returns {Promise<void>}
 */
export async function run(command) {
    await updateLeaderboardCache();
    if (await leaderboardNotAvailable(command)) return;
    await command.reply(createLeaderboardMessage(command.user.id, 0));
}
