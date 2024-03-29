// @ts-nocheck

/**
 * @typedef Config
 * @property {string} discordToken
 * @property {object} testaustime
 * @property {string} testaustime.username
 * @property {string} testaustime.password
 * @property {string} testaustime.leaderboard
 */

/**
 * Application configuration
 * @type {Config}
 */
export const config = {
    discordToken: process.env.DISCORD_TOKEN,
    testaustime: {
        username: process.env.TESTAUSTIME_USER,
        password: process.env.TESTAUSTIME_PASS,
        leaderboard: process.env.TESTAUSTIME_LEADERBOARD,
    },
};
