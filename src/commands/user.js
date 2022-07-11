import { MessageEmbed, Util } from "discord.js";
import { ctx } from "../ctx";
import { TimeUtil } from "../lib/TimeUtil";

/** @type {import("discord.js").ApplicationCommandData} */
export const data = {
    name: "user",
    description: "Data about a specific user",
    type: "CHAT_INPUT",
    options: [
        {
            type: "STRING",
            name: "user",
            description: "The user to get data about",
            required: true,
            autocomplete: true,
        },
        {
            type: "STRING",
            name: "timeframe",
            description: "Time range from which to accumulate data from. Default to month.",
            required: false,
            choices: [
                {
                    name: "past day",
                    value: "day",
                },
                {
                    name: "past week",
                    value: "week",
                },
                {
                    name: "past month",
                    value: "month",
                },
                {
                    name: "all time",
                    value: "all",
                },
            ],
        },
        {
            type: "STRING",
            name: "language",
            description: "Language to filter for",
            required: false,
            autocomplete: true,
        },
        {
            type: "STRING",
            name: "project",
            description: "Project to filter for",
            required: false,
            autocomplete: true,
        },
    ],
};

/**
 * Update user cache
 * @returns {Promise<void>}
 */
async function updateUserCache() {
    if (ctx.cache.lastUpdatedUsers < Date.now() - 60 * 1000) {
        const res = /** @type {string[] | null} */ (
            (await ctx.testaustime.listFriends().catch(() => null))?.map((f) => f.username).sort()
        );
        if (res) {
            ctx.cache.users = res;
            ctx.cache.lastUpdatedUsers = Date.now();
        }
    }
}

/**
 * Get user from cache or fetch new data
 * @param {string} user
 * @returns {Promise<import("../lib/Testaustime").ActivityEntry[]|null>}
 */
async function getOrFetchUser(user) {
    if (ctx.cache.activities[user]?.lastUpdated < Date.now() - 60 * 1000)
        return ctx.cache.activities[user].data;
    return ctx.testaustime.getActivity(user, { min_duration: 1 }).catch(() => null);
}

/**
 * @param {import("discord.js").CommandInteraction} command
 * @returns {Promise<void>}
 */
export async function run(command) {
    const user = command.options.getString("user", true);

    await updateUserCache();

    if (!ctx.cache.users.includes(user)) {
        await command.reply({
            content: `User \`${Util.escapeInlineCode(user)}\` has not allowed data collection`,
            ephemeral: true,
        });
        return;
    }

    const unfiltered = await getOrFetchUser(user);

    if (!unfiltered) {
        await command.reply({
            content: "Error occured, bot probably got ratelimited.",
            ephemeral: true,
        });
        return;
    }

    const language = command.options.getString("language", false);
    const project = command.options.getString("project", false);

    const timeframe = command.options.getString("timeframe", false) ?? "month";
    const cutoffPoint = {
        day: Date.now() - TimeUtil.Multipliers.DAY * 1000,
        week: Date.now() - TimeUtil.Multipliers.WEEK * 1000,
        month: Date.now() - TimeUtil.Multipliers.MONTH * 1000,
    }[timeframe];

    const activity = unfiltered.filter(
        (e) =>
            (timeframe !== "all" ? new Date(e.start_time).getTime() > cutoffPoint : true) &&
            (language ? e.language === language : true) &&
            (project ? e.project_name === project : true)
    );

    if (!activity.length) {
        await command.reply("This user has done nothing that matches these restrictions.");
        return;
    }

    let time = 0;
    const projects = {};
    const languages = {};

    for (const entry of activity) {
        time += entry.duration;

        if (!projects[entry.project_name]) projects[entry.project_name] = entry.duration;
        else projects[entry.project_name] += entry.duration;

        if (!languages[entry.language]) languages[entry.language] = entry.duration;
        else languages[entry.language] += entry.duration;
    }

    const MAX_LIST_LENGTH = 15;

    const embed = new MessageEmbed()
        .setTitle(user)
        .setColor("AQUA")
        .setDescription(
            `Total time programmed in ${
                {
                    all: "total",
                    day: "the past day",
                    month: "the last 30 days",
                    week: "the last 7 days",
                }[timeframe]
            } \`${TimeUtil.formatSecond(time)}\``
        )
        .addField(
            `Languages ${
                Object.keys(languages).length >= MAX_LIST_LENGTH ? `(top ${MAX_LIST_LENGTH})` : ""
            }`,
            Object.entries(languages)
                .sort(([, a], [, b]) => b - a)
                .slice(0, MAX_LIST_LENGTH)
                .map(
                    ([l, t], i) =>
                        `**${i + 1}.** ${Util.escapeMarkdown(l)} \`${TimeUtil.formatSecond(t)}\``
                )
                .join("\n"),
            true
        )
        .addField(
            `Projects ${
                Object.keys(projects).length > MAX_LIST_LENGTH ? `(top ${MAX_LIST_LENGTH})` : ""
            }`,
            Object.entries(projects)
                .sort(([, a], [, b]) => b - a)
                .slice(0, MAX_LIST_LENGTH)
                .map(
                    ([n, t], i) =>
                        `**${i + 1}.** ${Util.escapeMarkdown(n)} \`${TimeUtil.formatSecond(t)}\``
                )
                .join("\n"),
            true
        )
        .setTimestamp();

    await command.reply({ embeds: [embed] });
}

/**
 * @param {import("discord.js").AutocompleteInteraction} autocomplete
 * @return {Promise<void>}
 */
export async function autocompleter(autocomplete) {
    const query = /** @type {string} */ (autocomplete.options.getFocused()).toLowerCase();
    switch (autocomplete.options.getFocused(true).name) {
        case "user": {
            await updateUserCache();
            await autocomplete.respond(
                ctx.cache.users
                    .filter((u) => u.toLowerCase().includes(query))
                    .slice(0, 25)
                    .map((u) => ({ name: u, value: u }))
            );
            break;
        }
        case "language": {
            const user = autocomplete.options.getString("user", false) ?? "";
            const activity = await getOrFetchUser(user);
            if (!activity) {
                await autocomplete.respond([]);
                return;
            }
            const languages = activity
                .reduce((a, c) => (a.includes(c.language) ? a : a.concat(c.language)), [])
                .filter(Boolean);
            await autocomplete.respond(
                languages
                    .filter((l) => l.toLowerCase().includes(query))
                    .sort()
                    .slice(0, 25)
                    .map((p) => ({ name: p, value: p }))
            );
            break;
        }
        case "project": {
            const user = autocomplete.options.getString("user", false) ?? "";
            const activity = await getOrFetchUser(user);
            if (!activity) {
                await autocomplete.respond([]);
                return;
            }
            const projects = activity
                .reduce((a, c) => (a.includes(c.project_name) ? a : a.concat(c.project_name)), [])
                .filter(Boolean);
            await autocomplete.respond(
                projects
                    .filter((p) => p.toLowerCase().includes(query))
                    .sort()
                    .slice(0, 25)
                    .map((p) => ({ name: p, value: p }))
            );
            break;
        }
        default:
    }
}
