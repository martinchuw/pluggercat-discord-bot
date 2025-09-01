const { SlashCommandBuilder } = require("discord.js");

const { log, error } = require("../../utils/logger");

module.exports = {

  data: new SlashCommandBuilder()
    .setName("sacarlucio")
    .setDescription("Saca al usuario Lucio del voicechat específico."),

  async execute(interaction) {
    const guild = interaction.guild;
    if (!guild) {
      await interaction.reply({ content: "Este comando solo funciona en servidores.", ephemeral: true });
      return;
    }

    const userId = "1242609414763188295";

    try {
      const member = await guild.members.fetch(userId);


      if (!member.voice.channel) {
        await interaction.reply({ content: "Lucio no está en ningún canal de voz.", ephemeral: true });
        return;
      }

      await member.voice.disconnect("Comando sacarlucio ejecutado.");
      log(`Lucio fue sacado del canal de voz por comando.`);
      await interaction.reply({ content: "Lucio fue sacado del canal de voz.", ephemeral: false });
    } catch (err) {
      error(`Error al sacar a Lucio: ${err}`);
      await interaction.reply({ content: "No se pudo sacar a Lucio del canal de voz.", ephemeral: true });
    }
  }
};