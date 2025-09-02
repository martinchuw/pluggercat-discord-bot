const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const Roblox = require('../../services/webapis/roblox');
const RobloxApis = new Roblox();

module.exports = {
  data: new SlashCommandBuilder()
    .setName("getrobloxid")
    .setDescription("Get a Roblox UserId from an username. (if valid)")
    .addStringOption((option) =>
      option
        .setName("username")
        .setDescription("Username to get the id from.")
        .setRequired(true)
    ),

  async execute(interaction) {
    await interaction.deferReply();
    try {
        const robloxUsername = interaction.options.getString('username');
        const ids = await RobloxApis.getIdsFromNames([robloxUsername]);

        if (ids.data && ids.data[0] != null) {
          const userData = ids.data[0];
          const thumbnailData = await RobloxApis.getUserHeadShot(userData.id, '60x60');
          const thumbnailUrl = thumbnailData.data[0].imageUrl;

          const embed = new EmbedBuilder()
            .setAuthor({
              name: `${userData.displayName} (@${userData.name})`,
              url: `https://roblox.com/users/${userData.id}/profile`,
              iconURL: thumbnailUrl,
            })
            .setDescription(`La ID del usuario es: \`${userData.id}\``)
            .setColor("#f5003d")
            .setTimestamp();
          
          await interaction.editReply({
            embeds: [embed]
          });
        } else {
          await interaction.editReply('El usuario no es valido o hubo un error.');
        }
        
    } catch (error) {
        console.log(error);
        await interaction.editReply('Hubo un error, revisa la consola para más información.');
    }
  }
};
