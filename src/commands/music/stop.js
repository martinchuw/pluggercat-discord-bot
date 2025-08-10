const { SlashCommandBuilder } = require("discord.js");
const { isUserAllowed } = require("../../utils/permissions");
const player = require("../../services/audio/playerService");

module.exports = {
  data: new SlashCommandBuilder().setName("stop").setDescription("Stop and disconnect"),
  async execute(interaction, ctx) {
    if (!isUserAllowed(interaction.user.id)) return interaction.reply("You are not allowed to use this command.");
    return player.stop(interaction, ctx.cleanupSession);
  }
};
