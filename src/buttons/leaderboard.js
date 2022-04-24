import {
    createLeaderboardMessage,
    leaderboardNotAvailable,
    updateLeaderboardCache,
} from "../commands/leaderboard";

/**
 * @param {import("discord.js").ButtonInteraction} button
 * @param {string[]} args
 * @returns {Promise<void>}
 */
export async function run(button, args) {
    const [user, page] = args;
    if (button.user.id !== user) {
        await button.reply({
            content: "You didn't call this embed.",
            ephemeral: true,
        });
        return;
    }

    await updateLeaderboardCache();
    if (await leaderboardNotAvailable(button)) return;
    await button.update(createLeaderboardMessage(button.user.id, parseInt(page, 10)));
}
