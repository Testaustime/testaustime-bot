import { ctx } from "../ctx";

/**
 * @param {import("discord.js").Interaction} interaction
 * @returns {Promise<void>}
 */
export default async function interactionCreate(interaction) {
    if (interaction.isCommand()) {
        try {
            const command = ctx.commands.get(interaction.commandName);
            if (!command) {
                console.error(`Unhandled slash command "${interaction.commandName}"`);
                await interaction.reply({
                    content: "For some reason this command was left unhandled.",
                    ephemeral: true,
                });
                return;
            }

            await command.run(interaction);
        } catch (e) {
            try {
                await interaction[
                    interaction.replied || interaction.deferred ? "editReply" : "reply"
                ]({
                    content: "Something went wrong while executing that command...",
                    ephemeral: true,
                });
            } catch (_) {
                // ignore
            } finally {
                console.error(`Error while handling a command\n${e.stack}`);
            }
        }
    } else if (interaction.isAutocomplete()) {
        try {
            const command = ctx.commands.get(interaction.commandName);
            if (!command || !command.autocompleter) {
                console.error(`Unhandled autocomplete "${interaction.commandName}"`);
                await interaction.respond([]);
                return;
            }

            await command.autocompleter(interaction);
        } catch (e) {
            try {
                if (!interaction.responded) await interaction.respond([]);
            } catch (_) {
                // ignore
            } finally {
                console.error(`Error while handling a command\n${e.stack}`);
            }
        }
    } else if (interaction.isButton()) {
        try {
            const args = interaction.customId.split(".");
            const buttonName = args.shift();
            const button = ctx.buttons.get(buttonName);
            if (!button) {
                console.error(`Unhandled button "${buttonName}"`);
                await interaction.reply({
                    content: "For some reason this button was left unhandled.",
                    ephemeral: true,
                });
                return;
            }

            await button.run(interaction, args);
        } catch (e) {
            try {
                await interaction[
                    interaction.replied || interaction.deferred ? "editReply" : "reply"
                ]({
                    content: "Something went wrong while executing that button...",
                    ephemeral: true,
                });
            } catch (_) {
                // ignore
            } finally {
                console.error(`Error while handling a button\n${e.stack}`);
            }
        }
    }
}
