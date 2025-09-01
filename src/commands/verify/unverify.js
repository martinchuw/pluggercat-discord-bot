//codigo feo de martinchu

const { SlashCommandBuilder } = require("discord.js");

const ALLOWED_USERS = (process.env.ALLOWED_USERS || "")
  .split(",")
  .map(s => s.trim())
  .filter(Boolean);

module.exports = {
  data: new SlashCommandBuilder()
    .setName("unverify")
    .setDescription("Quitar rol de verificado a un usuario")
    .addUserOption(opt => opt.setName("usuario").setDescription("Usuario al que quitar el rol").setRequired(true)),

  async execute(interaction) {
    if (!interaction.guild) {
      return interaction.reply({ content: "Este comando solo se puede usar en servidores.", ephemeral: true });
    }

    if (!ALLOWED_USERS.includes(interaction.user.id)) {
      return interaction.reply({ content: "No estás autorizado para usar este comando.", ephemeral: true });
    }

    const roleId = "1404264534918565888";
    const userOption = interaction.options.getUser("usuario");
    let target = interaction.options.getMember("usuario");

    if (!target) {
      try {
        target = await interaction.guild.members.fetch(userOption.id);
      } catch (e) {
        return interaction.reply({ content: "No se pudo encontrar al usuario.", ephemeral: true });
      }
    }

    if (!target.roles.cache.has(roleId)) {
      return interaction.reply({ content: "El usuario no tiene el rol de verificado.", ephemeral: true });
    }

    try {
      await target.roles.remove(roleId, `Desverificado por ${interaction.user.tag}`);
      return interaction.reply({ content: `Rol de verificado removido a ${target.user.tag}.`, ephemeral: false });
    } catch (err) {
      console.error("Error al quitar rol:", err);
      return interaction.reply({ content: "No se pudo quitar el rol. Asegúrate de que mi rol esté por encima del rol objetivo y que tengo permisos.", ephemeral: true });
    }
  },
};