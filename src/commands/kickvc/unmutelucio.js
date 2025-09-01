// NOMBRE DEL ARCHIVO: unmutearlucio.js

const { SlashCommandBuilder } = require("discord.js");
const { log, error } = require("../../utils/logger");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("unmutearlucio")
    .setDescription("Desmutea a Lucio en el canal de voz."),
  
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
        await interaction.reply({ content: "Lucio no está en ningún canal de voz para ser desmuteado.", ephemeral: true });
        return;
      }

      // Verificar si no está muteado
      if (!member.voice.serverMute) {
        await interaction.reply({ content: "Lucio no está muteado.", ephemeral: true });
        return;
      }

      // Desmutear al usuario
      await member.voice.setMute(false, "Comando unmutearlucio ejecutado.");
      log(`Lucio fue desmuteado en el canal de voz por comando.`);
      await interaction.reply({ content: "Lucio ha sido desmuteado en el canal de voz.", ephemeral: false });

    } catch (err) {
      error(`Error al desmutear a Lucio: ${err}`);
      await interaction.reply({ content: "No se pudo desmutear a Lucio.", ephemeral: true });
    }
  }
};