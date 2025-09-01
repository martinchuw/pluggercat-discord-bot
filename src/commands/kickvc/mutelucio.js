// NOMBRE DEL ARCHIVO: mutearlucio.js

const { SlashCommandBuilder } = require("discord.js");
const { log, error } = require("../../utils/logger");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("mutearlucio")
    .setDescription("Mutea a Lucio en el canal de voz (muteo de servidor)."),
  
  async execute(interaction) {
    const guild = interaction.guild;
    if (!guild) {
      await interaction.reply({ content: "Este comando solo funciona en servidores.", ephemeral: true });
      return;
    }

    const userId = "1242609414763188295";

    try {
      const member = await guild.members.fetch(userId);

      // Verificar si el usuario está en un canal de voz
      if (!member.voice.channel) {
        await interaction.reply({ content: "Lucio no está en ningún canal de voz.", ephemeral: true });
        return;
      }

      // Verificar si ya está muteado
      if (member.voice.serverMute) {
        await interaction.reply({ content: "Lucio ya se encuentra muteado.", ephemeral: true });
        return;
      }

      // Mutear al usuario
      await member.voice.setMute(true, "Comando mutearlucio ejecutado.");
      log(`Lucio fue muteado en el canal de voz por comando.`);
      await interaction.reply({ content: "Lucio ha sido muteado en el canal de voz.", ephemeral: false });

    } catch (err) {
      error(`Error al mutear a Lucio: ${err}`);
      await interaction.reply({ content: "No se pudo mutear a Lucio.", ephemeral: true });
    }
  }
};