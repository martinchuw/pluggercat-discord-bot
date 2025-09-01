//codigo feo de martinchu

const { SlashCommandBuilder } = require("discord.js");
const { log, error } = require("../../utils/logger");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("sacarveneco")
    .setDescription("Saca al usuario veneco del voicechat."),

  async execute(interaction) {
    const guild = interaction.guild;
    if (!guild) {
      await interaction.reply({ content: "Este comando solo funciona en servidores.", ephemeral: true });
      return;
    }

    const userId = "703880828580303430";

    try {
      const member = await guild.members.fetch(userId);

      if (!member.voice.channel) {
        await interaction.reply({ content: "veneco no está en ningún canal de voz.", ephemeral: true });
        return;
      }

      await member.voice.disconnect("Comando sacarveneco ejecutado.");
      log(`veneco fue sacado del canal de voz por comando.`);
      await interaction.reply({ content: "veneco fue sacado del canal de voz.", ephemeral: false });
    } catch (err) {
      error(`Error al sacar a veneco: ${err}`);
      await interaction.reply({ content: "No se pudo sacar a veneco del canal de voz.", ephemeral: true });
    }
  }
};