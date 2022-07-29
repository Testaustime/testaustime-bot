import { createCanvas } from "@napi-rs/canvas";
import {
    ApplicationCommandOptionType,
    ApplicationCommandType,
    Colors,
    EmbedBuilder,
    escapeInlineCode,
    escapeMarkdown,
} from "discord.js";
import { ctx } from "../ctx";
import { TimeUtil } from "../lib/TimeUtil";

/** @type {import("discord.js").ApplicationCommandData} */
export const data = {
    name: "user",
    description: "Data about a specific user",
    type: ApplicationCommandType.ChatInput,
    options: [
        {
            type: ApplicationCommandOptionType.String,
            name: "user",
            description: "The user to get data about",
            required: true,
            autocomplete: true,
        },
        {
            type: ApplicationCommandOptionType.String,
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
            type: ApplicationCommandOptionType.String,
            name: "language",
            description: "Language to filter for",
            required: false,
            autocomplete: true,
        },
        {
            type: ApplicationCommandOptionType.String,
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
 * @param {import("discord.js").ChatInputCommandInteraction} command
 * @returns {Promise<void>}
 */
export async function run(command) {
    const user = command.options.getString("user", true);

    await command.deferReply();
    await updateUserCache();

    if (!ctx.cache.users.includes(user)) {
        await command.editReply(
            `User \`${escapeInlineCode(user)}\` has not allowed data collection`
        );
        return;
    }

    const unfiltered = await getOrFetchUser(user);

    if (!unfiltered) {
        await command.editReply("Error occured, bot probably got ratelimited.");
        return;
    }

    const language = command.options.getString("language", false);
    const project = command.options.getString("project", false);

    // TODO: use new summary endpoint or at least filter timerange the same as web frontend

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
        await command.editReply("This user has done nothing that matches these restrictions.");
        return;
    }

    let time = 0;
    const projects = {};
    const languages = {};
    const days = {};

    for (const entry of activity) {
        time += entry.duration;

        if (!projects[entry.project_name]) projects[entry.project_name] = entry.duration;
        else projects[entry.project_name] += entry.duration;

        if (!languages[entry.language]) languages[entry.language] = entry.duration;
        else languages[entry.language] += entry.duration;

        const d = new Date(entry.start_time);
        const ds = `${d.getUTCDate()}.${d.getUTCMonth() + 1}.`;
        if (!days[ds]) days[ds] = 0;
        days[ds] += entry.duration;
    }

    const MAX_LIST_LENGTH = 10;

    const embed = new EmbedBuilder()
        .setTitle(user)
        .setColor(Colors.Aqua)
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
        .addFields([
            {
                name: `Languages ${
                    Object.keys(languages).length >= MAX_LIST_LENGTH
                        ? `(top ${MAX_LIST_LENGTH})`
                        : ""
                }`,
                value: Object.entries(languages)
                    .sort(([, a], [, b]) => b - a)
                    .slice(0, MAX_LIST_LENGTH)
                    .map(
                        ([l, t], i) =>
                            `**${i + 1}.** ${
                                escapeMarkdown(l) || "*Unknown*"
                            }\n\`${TimeUtil.formatSecond(t)}\``
                    )
                    .join("\n"),
                inline: true,
            },
            {
                name: `Projects ${
                    Object.keys(projects).length > MAX_LIST_LENGTH ? `(top ${MAX_LIST_LENGTH})` : ""
                }`,
                value: Object.entries(projects)
                    .sort(([, a], [, b]) => b - a)
                    .slice(0, MAX_LIST_LENGTH)
                    .map(
                        ([n, t], i) =>
                            `**${i + 1}.** ${
                                escapeMarkdown(n) || "*Unknown*"
                            }\n\`${TimeUtil.formatSecond(t)}\``
                    )
                    .join("\n"),
                inline: true,
            },
        ])
        .setTimestamp();

    if (timeframe !== "day") {
        embed.setImage("attachment://graph.png");

        // creation
        const graph = createCanvas(1280, 720);
        const c = graph.getContext("2d");

        // settings
        const padding = 50;
        const paddingExtra = 100;
        const gridColor = "#707070";
        const textColor = "#adadad";
        const graphColor = "rgb(101, 154, 240)";
        const graphFillColor = "rgba(101, 154, 240, 0.25)";
        const lineWidth = 5;
        const maxLines = 12;
        const fontSize = 40;

        // calculate stuff
        const lineOffset = Math.floor(lineWidth / 2);

        const firstAllCodingDay = new Date(activity[0].start_time);
        const diff = new Date().getTime() - firstAllCodingDay.getTime();
        const diffDays = Math.ceil(diff / (1000 * TimeUtil.Multipliers.DAY));
        const dayAmount = {
            week: 7,
            month: 30,
            all: diffDays,
        }[timeframe];

        let lineInterval = 1;
        while (dayAmount / lineInterval > maxLines) lineInterval += 1;

        const graphHeight = graph.height - padding - paddingExtra;
        const graphWidth = graph.width - padding - paddingExtra;

        const gap = graphWidth / (dayAmount - 1);

        const firstDay = new Date(Date.now() - (dayAmount - 1) * TimeUtil.Multipliers.DAY * 1000);

        const highestDay = Math.max(...Object.values(days));
        const highestDayHours = highestDay / TimeUtil.Multipliers.HOUR;

        let graphCeil = 0;
        let hourGap = 0;

        if (highestDayHours <= 4) hourGap = 1;
        else if (highestDayHours < 12) hourGap = 2;
        else hourGap = 4;

        while (graphCeil < highestDayHours) graphCeil += hourGap;

        // font
        c.font = `sans-serif ${fontSize}px`;

        // vertical lines
        c.fillStyle = gridColor;
        c.fillRect(graph.width - padding - lineOffset, padding, lineWidth, graphHeight + lineWidth);

        c.textAlign = "end";
        for (let i = 0; i <= graphCeil; i += 1) {
            if (i % hourGap === 0) {
                c.fillStyle = gridColor;
                const y = Math.floor(graph.height - paddingExtra - (i * graphHeight) / graphCeil);
                c.fillRect(paddingExtra, y, graphWidth, lineWidth);
                c.fillStyle = textColor;
                c.fillText(`${i} h`, paddingExtra - 15, i === 0 ? y : Math.floor(y + fontSize / 2));
            }
        }

        // horizontal lines
        c.textAlign = "center";
        for (let i = 0; i < dayAmount; i += 1) {
            if (i % lineInterval === 0) {
                const d = new Date(firstDay.getTime() + i * TimeUtil.Multipliers.DAY * 1000);
                const x = Math.floor(paddingExtra + i * gap - lineOffset);
                c.fillStyle = gridColor;
                c.fillRect(x, padding, lineWidth, graphHeight + lineWidth);
                c.fillStyle = textColor;
                c.fillText(
                    `${d.getUTCDate()}.${d.getUTCMonth() + 1}.`,
                    x,
                    graph.height - paddingExtra + fontSize + 10
                );
            }
        }

        // calculate coordinates for points
        const points = Array(dayAmount)
            .fill(0)
            .map((_, i) => {
                const d = new Date(firstDay.getTime() + i * TimeUtil.Multipliers.DAY * 1000);
                const dayStr = `${d.getUTCDate()}.${d.getUTCMonth() + 1}.`;
                const seconds = days[dayStr] ?? 0;
                const percent = seconds / TimeUtil.Multipliers.HOUR / graphCeil;
                const x = Math.floor(paddingExtra + i * gap - lineOffset);
                const y = Math.floor(graph.height - paddingExtra - percent * graphHeight);
                return { x, y };
            });

        // draw line
        c.lineWidth = lineWidth * 2;
        c.strokeStyle = graphColor;
        c.lineJoin = "round";

        c.beginPath();
        c.moveTo(points[0].x, points[0].y);

        // magic for smoothing
        for (let i = 0; i < points.length - 1; i += 1) {
            const p0 = i > 0 ? points[i - 1] : points[0];
            const p1 = points[i];
            const p2 = points[i + 1];
            const p3 = i !== points.length - 2 ? points[i + 2] : p2;
            const cp1x = p1.x + ((p2.x - p0.x) / 6) * 0.75;
            const cp1y = p1.y + ((p2.y - p0.y) / 6) * 0.75;
            const cp2x = p2.x - ((p3.x - p1.x) / 6) * 0.75;
            const cp2y = p2.y - ((p3.y - p1.y) / 6) * 0.75;
            c.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
        }
        c.stroke();

        // graph fill
        c.strokeStyle = "rgba(0, 0, 0, 0)";
        c.fillStyle = graphFillColor;
        c.lineTo(graph.width - padding, graph.height - paddingExtra);
        c.lineTo(paddingExtra, graph.height - paddingExtra);
        c.lineTo(points[0].x, points[0].y);
        c.fill();

        // points
        for (const { x, y } of points) {
            c.fillStyle = graphColor;
            c.beginPath();
            c.arc(x, y, lineWidth * 3, 0, 2 * Math.PI);
            c.fill();
        }

        await command.editReply({
            embeds: [embed],
            files: [
                {
                    name: "graph.png",
                    attachment: graph.toBuffer("image/png"),
                },
            ],
        });
    } else {
        await command.editReply({
            embeds: [embed],
        });
    }
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
                .reduce(
                    (a, c) => (a.includes(c.language) ? a : a.concat(c.language)),
                    /** @type {string[]} */ ([])
                )
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
            const user = autocomplete.options.getString("user", false);
            if (!user) {
                await autocomplete.respond([]);
                return;
            }
            const activity = await getOrFetchUser(user);
            if (!activity) {
                await autocomplete.respond([]);
                return;
            }
            const projects = activity
                .reduce(
                    (a, c) => (a.includes(c.project_name) ? a : a.concat(c.project_name)),
                    /** @type {string[]} */ ([])
                )
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
