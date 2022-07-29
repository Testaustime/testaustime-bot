/**
 * @typedef Command
 * @property {(command: import("discord.js").CommandInteraction) => Promise<void>} run
 * @property {(command: import("discord.js").AutocompleteInteraction) => Promise<void>} [autocompleter]
 * @property {import("discord.js").ApplicationCommandData} data
 */

/**
 * @typedef Button
 * @property {(button: import("discord.js").ButtonInteraction, args: string[]) => Promise<void>} run
 */

/**
 * @typedef Context
 * @property {import("discord.js").Client} client
 * @property {import("./lib/Testaustime").Testaustime} testaustime
 * @property {Map<string, Command>} commands
 * @property {Map<string, Button>} buttons
 * @property {object} data
 * @property {string} data.leaderboardInvite
 * @property {string} data.friendCode
 * @property {string} data.botName
 * @property {object} cache
 * @property {number} cache.lastUpdatedUsers
 * @property {string[]} cache.users
 * @property {number} cache.lastUpdatedLeaderboard
 * @property {import("./lib/Testaustime").LeaderboardMember[]} cache.leaderboard
 * @property {Record<string, {
 *   lastUpdated: number,
 *   data: import("./lib/Testaustime").ActivityEntry[],
 * }>} cache.activities
 */

/**
 * Global context
 * @type {Context}
 */
export const ctx = {
    // @ts-ignore
    client: null,
    // @ts-ignore
    testaustime: null,
    commands: new Map(),
    buttons: new Map(),
    data: {
        leaderboardInvite: "",
        friendCode: "",
        botName: "",
    },
    cache: {
        lastUpdatedUsers: 0,
        users: [],
        lastUpdatedLeaderboard: 0,
        leaderboard: [],
        activities: {},
    },
};
