const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const {
  getUserUploadStats,
  getUserFiles,
} = require("../../core/fileSessionManager");
const { formatUserStats } = require("../../utils/uploadUtils");
const { UPLOAD_SERVICES } = require("../../services/upload/uploadManager");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("uploadstats")
    .setDescription("View your file upload statistics")
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("View stats for another user (admin only)")
        .setRequired(false)
    ),

  async execute(interaction) {
    await interaction.deferReply();

    try {
      // Check if user is trying to view another user's stats
      const targetUser = interaction.options.getUser("user");
      let userId = interaction.user.id;
      let displayName = interaction.user.displayName;

      if (targetUser) {
        // Check if user has permission to view other users' stats
        if (!interaction.member.permissions.has("Administrator")) {
          const embed = new EmbedBuilder()
            .setColor("#ff0000")
            .setTitle("❌ Permission Denied")
            .setDescription(
              "You need Administrator permissions to view other users' statistics."
            );

          await interaction.editReply({ embeds: [embed] });
          return;
        }

        userId = targetUser.id;
        displayName = targetUser.displayName;
      }

      // Get user stats and recent files
      const [stats, recentFiles] = await Promise.all([
        formatUserStats(userId),
        getUserFiles(userId, { limit: 5 }),
      ]);

      // Calculate service breakdown
      const serviceBreakdown = {};
      let totalSize = 0;
      let temporaryFiles = 0;
      let expiredFiles = 0;
      const now = new Date();

      for (const file of await getUserFiles(userId, { limit: 1000 })) {
        const service = file.upload_service;

        if (!serviceBreakdown[service]) {
          serviceBreakdown[service] = { count: 0, size: 0 };
        }

        serviceBreakdown[service].count++;
        serviceBreakdown[service].size += file.file_size || 0;
        totalSize += file.file_size || 0;

        if (file.is_temporary) {
          temporaryFiles++;

          if (file.expires_at && new Date(file.expires_at) < now) {
            expiredFiles++;
          }
        }
      }

      const embed = new EmbedBuilder()
        .setColor("#0099ff")
        .setTitle(`📊 Upload Statistics for ${displayName}`)
        .setThumbnail(
          targetUser
            ? targetUser.displayAvatarURL()
            : interaction.user.displayAvatarURL()
        );

      // Overview section
      embed.addFields({
        name: "📈 Overview",
        value: [
          `📁 Total Files: **${stats.totalUploads}**`,
          `💾 Total Size: **${stats.totalSize}**`,
          `⏰ Last Upload: **${stats.lastUpload}**`,
          `📅 Member Since: **${stats.memberSince}**`,
        ].join("\n"),
        inline: true,
      });

      // Service breakdown
      if (Object.keys(serviceBreakdown).length > 0) {
        const serviceText = Object.entries(serviceBreakdown)
          .map(([service, data]) => {
            const { formatBytes } = require("../../utils/uploadUtils");
            return `**${service.toUpperCase()}**: ${
              data.count
            } files (${formatBytes(data.size)})`;
          })
          .join("\n");

        embed.addFields({
          name: "🔗 Services Used",
          value: serviceText || "None",
          inline: true,
        });
      }

      // File status
      embed.addFields({
        name: "📋 File Status",
        value: [
          `🗂️ Permanent: **${stats.totalUploads - temporaryFiles}**`,
          `⏳ Temporary: **${temporaryFiles}**`,
          `⚠️ Expired: **${expiredFiles}**`,
        ].join("\n"),
        inline: true,
      });

      // Recent files
      if (recentFiles.length > 0) {
        const recentText = recentFiles
          .slice(0, 3)
          .map((file, index) => {
            const uploadDate = new Date(file.upload_date);
            const service = file.upload_service.toUpperCase();
            const expiryText = file.expires_at
              ? ` (expires <t:${Math.floor(
                  new Date(file.expires_at).getTime() / 1000
                )}:R>)`
              : "";

            return `${index + 1}. **${
              file.original_filename
            }**\n   ${service} • <t:${Math.floor(
              uploadDate.getTime() / 1000
            )}:R>${expiryText}`;
          })
          .join("\n\n");

        embed.addFields({
          name: "📄 Recent Files",
          value: recentText,
          inline: false,
        });
      }

      // Storage recommendations
      const recommendations = [];
      if (expiredFiles > 0) {
        recommendations.push(
          "⚠️ You have expired temporary files that can be cleaned up"
        );
      }
      if (temporaryFiles > stats.totalUploads * 0.8) {
        recommendations.push(
          "💡 Consider using permanent storage (Catbox) for important files"
        );
      }
      if (stats.totalUploads === 0) {
        recommendations.push("🚀 Use `/upload file` to start uploading files!");
      }

      if (recommendations.length > 0) {
        embed.addFields({
          name: "💡 Recommendations",
          value: recommendations.join("\n"),
          inline: false,
        });
      }

      embed.setTimestamp();
      embed.setFooter({
        text: `Use /upload list to see all files • Use /upload file to upload new files`,
      });

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error("Upload stats error:", error);

      const errorEmbed = new EmbedBuilder()
        .setColor("#ff0000")
        .setTitle("❌ Error")
        .setDescription(
          `Failed to retrieve upload statistics: ${error.message}`
        )
        .setTimestamp();

      await interaction.editReply({ embeds: [errorEmbed] });
    }
  },
};
