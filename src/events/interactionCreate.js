const { log } = require("../utils/logger");

function onInteractionCreate(commands) {
  return async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    const cmd = commands.get(interaction.commandName);
    if (!cmd) return;

    try {
      await cmd.execute(interaction, interaction.client.context);
    } catch (e) {
      log("Command error:", e);
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply("An error occurred while executing the command.");
      } else {
        await interaction.reply("An error occurred while executing the command.");
      }
    }
  };
}

module.exports = { onInteractionCreate };
