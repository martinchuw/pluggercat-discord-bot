const { SlashCommandBuilder } = require("discord.js");
const { isUserAllowed } = require("../../utils/permissions");
const { getSession } = require("../../core/sessionManager");
const player = require("../../services/audio/playerService");

module.exports = {
  data: new SlashCommandBuilder().setName("queue").setDescription("Show the queue"),
  async execute(interaction) {
    if (!isUserAllowed(interaction.user.id)) return interaction.reply("You are not allowed to use this command.");
    const session = getSession(interaction.guild.id);
    return interaction.reply(player.getQueueText(session));
  }
};
