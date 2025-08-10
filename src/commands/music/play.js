const { SlashCommandBuilder } = require("discord.js");
const { isUserAllowed } = require("../../utils/permissions");
const player = require("../../services/audio/playerService");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("play")
    .setDescription("Play a YouTube URL in your voice channel")
    .addStringOption(opt => opt.setName("url").setDescription("YouTube URL").setRequired(true)),
  async execute(interaction, ctx) {
    if (!isUserAllowed(interaction.user.id)) {
      return interaction.reply("You are not allowed to use this command.");
    }
    const url = interaction.options.getString("url");
    return player.play(interaction, url);
  }
};
