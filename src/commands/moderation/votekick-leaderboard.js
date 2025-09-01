const {
  SlashCommandBuilder,
  EmbedBuilder,
  InteractionContextType,
} = require("discord.js");
const { getLeaderboard } = require("../../services/moderation/votekickService");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("votekick-leaderboard")
    .setDescription("Shows the top users with the most votekicks in this server.")
    .addIntegerOption(o =>
      o.setName("top")
        .setDescription("Number of users to display (default 10).")
        .setMinValue(1)
        .setMaxValue(25)
    )
    .setContexts([InteractionContextType.Guild]),

  async execute(interaction) {
    const top = interaction.options.getInteger("top") ?? 10;
    const rows = await getLeaderboard(interaction.guild.id, top);

    if (!rows.length) {
      return interaction.reply("No votekick records found for this server.");
    }

    const lines = rows.map((r, idx) => {
      const userMention = `<@${r.userId}>`;
      const lastDate = new Date(r.last_at).toLocaleString();
      return `${idx + 1}. ${userMention} — ${r.total_events} events (last: ${lastDate})`;
    });

    const embed = new EmbedBuilder()
      .setTitle("Votekick Leaderboard")
      .setDescription(lines.join("\n"))
      .setColor(0x5865f2);

    return interaction.reply({ embeds: [embed] });
  }
};
