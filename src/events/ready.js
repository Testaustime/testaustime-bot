import { ctx } from "../ctx";

/**
 * @return {Promise<void>}
 */
export default async function ready() {
    console.log(`Ready and logged in as ${ctx.client.user?.tag}!`);
}
