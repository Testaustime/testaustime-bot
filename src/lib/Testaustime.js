import bent from "bent";

/**
 * @typedef LeaderboardMember
 * @property {string} username
 * @property {boolean} admin
 * @property {number} time_coded
 */

/**
 * @typedef ShallowLeaderboard
 * @property {string} name
 * @property {number} member_count
 */

/**
 * @typedef Leaderboard
 * @property {string} name
 * @property {string} invite
 * @property {string} creation_time
 * @property {LeaderboardMember[]} members
 */

/**
 * @typedef ActivityEntry
 * @property {number} id
 * @property {string} start_time
 * @property {number} duration
 * @property {string} project_name
 * @property {string} language
 * @property {string} editor_name
 * @property {string} hostname
 */

/**
 * @typedef Friend
 * @property {string} username
 * @property {object} coding_time
 * @property {number} all_time
 * @property {number} past_month
 * @property {number} past_week
 */

/**
 * @typedef SelfUser
 * @property {number} id
 * @property {string} friend_code
 * @property {string} username
 * @property {string} registration_time
 */

/**
 * @typedef ActivityOptions
 * @property {string} [language]
 * @property {string} [editor]
 * @property {string} [project_name]
 * @property {string} [hostname]
 * @property {number} [min_duration]
 */

// Yes, this API wrapper has more utilities than necessary for the function of this applications
// I don't care, shut up.
export class Testaustime {
    #host = "https://api.testaustime.fi/";

    #token = "";

    /**
     * Create a Testaustime client
     * Optionally use a third party server
     * @param {string} [host]
     */
    constructor(host) {
        if (host) {
            const parsed = new URL(host);
            this.#host = parsed.href;
        }
    }

    /**
     * Internal fetch wrapper which adds necessary headers
     * @param {"GET"|"POST"} method
     * @param {string} path
     * @param {import("bent").RequestBody} [body]
     * @returns {Promise<import("bent").ValidResponse>}
     */
    async #api(method, path, body) {
        // TODO: add request queue when ratelimiting headers are implemented
        return bent(method, "json")(`${this.#host}${path}`, body, {
            Authorization: `Bearer ${this.#token}`,
        });
    }

    /**
     * Login to Testaustime
     * @param {string} user
     * @param {string} pass
     * @returns {Promise<void>}
     */
    async login(user, pass) {
        const res = /** @type {{ auth_token: string }} */ (
            await bent("POST", "json")(`${this.#host}auth/login`, {
                username: user,
                password: pass,
            })
        );
        this.#token = res.auth_token;
    }

    /**
     * List available leaderboards
     * @returns {Promise<ShallowLeaderboard[]>} leaderboards
     */
    listLeaderboards() {
        return /** @type {Promise<ShallowLeaderboard[]>} */ (
            this.#api("GET", "users/@me/leaderboards")
        );
    }

    /**
     * List available friends
     * @returns {Promise<Friend[]>} friends
     */
    listFriends() {
        return /** @type {Promise<Friend[]>} */ (this.#api("GET", "friends/list"));
    }

    /**
     * Get full details of a leaderboard by name
     * @param {string} name
     * @returns {Promise<Leaderboard>} leaderboard
     */
    getLeaderboard(name) {
        return /** @type {Promise<Leaderboard>} */ (this.#api("GET", `leaderboards/${name}`));
    }

    /**
     * Get the logged in user
     * @returns {Promise<SelfUser>}
     */
    getMe() {
        return /** @type {Promise<SelfUser>}] */ (this.#api("GET", `users/@me`));
    }

    /**
     * Get activity of a user
     * User has to be self or a friend, defaults to self
     * @param {string} [name]
     * @param {ActivityOptions} [opts]
     * @returns {Promise<ActivityEntry[]>} data
     */
    getActivity(name, opts) {
        return /** @type {Promise<ActivityEntry[]>} */ (
            this.#api(
                "GET",
                `users/${name ?? "@me"}/activity/data${
                    opts
                        ? `?${Object.entries(opts)
                              .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
                              .join("&")}`
                        : ""
                }`
            )
        );
    }
}
