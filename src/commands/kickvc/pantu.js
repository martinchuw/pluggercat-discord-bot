const { SlashCommandBuilder } = require("discord.js");
const { log, error } = require("../../utils/logger");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("sacarpantugay")
    .setDescription("Saca al usuario GAY del voicechat específico."),
  async execute(interaction) {
    const guild = interaction.guild;
    if (!guild) {
      await interaction.reply({ content: "Este comando solo funciona en servidores.", ephemeral: true });
      return;
    }

    const userId = "916364207576977439";
    const voiceChannelId = "1409001039872528575";

    try {
      const member = await guild.members.fetch(userId);
      if (!member.voice.channel || member.voice.channel.id !== voiceChannelId) {
        await interaction.reply({ content: "gay no está en el canal de voz objetivo.", ephemeral: true });
        return;
      }

      await member.voice.disconnect("Comando sacarlucio ejecutado.");
      log(`Lucio fue sacado del canal de voz por comando.`);
      await interaction.reply({ content: "gay fue sacado del canal de voz.", ephemeral: false });
    } catch (err) {
      error(`Error al sacar a Lucio: ${err}`);
      await interaction.reply({ content: "No se pudo sacar a Lucio del canal de voz.", ephemeral: true });
    }
  }
};