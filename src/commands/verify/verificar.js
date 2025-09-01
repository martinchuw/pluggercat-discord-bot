//codigo feo de martinchu

const { SlashCommandBuilder } = require("discord.js");

const ALLOWED_USERS = (process.env.ALLOWED_USERS || "")
  .split(",")
  .map(s => s.trim())
  .filter(Boolean);

module.exports = {
  data: new SlashCommandBuilder()
    .setName("verify")
    .setDescription("Asignar rol de verificado a un usuario")
    .addUserOption(opt => opt.setName("usuario").setDescription("Usuario a verificar").setRequired(true)),

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

    if (target.roles.cache.has(roleId)) {
      return interaction.reply({ content: "El usuario ya tiene el rol de verificado.", ephemeral: true });
    }

    try {
      await target.roles.add(roleId, `Verificado por ${interaction.user.tag}`);
      return interaction.reply({ content: `Rol de verificado añadido a ${target.user.tag}.`, ephemeral: false });
    } catch (err) {
      console.error("Error al asignar rol:", err);
      return interaction.reply({ content: "No se pudo asignar el rol. Asegúrate de que mi rol esté por encima del rol a asignar y que tengo permisos.", ephemeral: true });
    }
  },
};