const {
  SlashCommandBuilder,
  EmbedBuilder,
  InteractionContextType,
} = require("discord.js");
const { getUserHistory } = require("../../services/moderation/votekickService");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("votekick-history")
    .setDescription("Shows the recent votekick history of a specific user.")
    .addUserOption(o =>
      o.setName("user")
        .setDescription("The user to check")
        .setRequired(true)
    )
    .addIntegerOption(o =>
      o.setName("limit")
        .setDescription("Number of events to display (default 10, max 25).")
        .setMinValue(1)
        .setMaxValue(25)
    )
    .setContexts([InteractionContextType.Guild]),

  async execute(interaction) {
    const user = interaction.options.getUser("user", true);
    const limit = interaction.options.getInteger("limit") ?? 10;

    const rows = await getUserHistory(interaction.guild.id, user.id, limit);

    if (!rows.length) {
      return interaction.reply(`${user.tag ?? user.username} has no votekick history in this server.`);
    }

    const lines = rows.map(r => {
      const date = new Date(r.created_at).toLocaleString();
      return `${date} — Action: ${r.action_type} — Votes: ${r.votes_yes}/${r.total_members_vc} — Result: ${r.result}`;
    });

    const embed = new EmbedBuilder()
      .setTitle(`Votekick History — ${user.tag ?? user.username}`)
      .setDescription(lines.join("\n"))
      .setColor(0x2b2d31);

    return interaction.reply({ embeds: [embed] });
  }
};
