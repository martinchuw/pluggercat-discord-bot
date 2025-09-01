const { SlashCommandBuilder } = require("discord.js");
const { isUserAllowed } = require("../../utils/permissions");
const { isValidUrl } = require("../../utils/urlValidator");
const { detectPlatform } = require("../../utils/platformDetector");
const player = require("../../services/audio/playerService");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("play")
    .setDescription(
      "Play music from YouTube, YouTube Music, Spotify, or SoundCloud"
    )
    .addStringOption((opt) =>
      opt
        .setName("query")
        .setDescription(
          "URL or search term (YouTube, YT Music, Spotify, SoundCloud)"
        )
        .setRequired(true)
    ),

  async execute(interaction, ctx) {
    if (!isUserAllowed(interaction.user.id)) {
      return interaction.reply("You are not allowed to use this command.");
    }

    const query = interaction.options.getString("query");

    const isUrl = isValidUrl(query);
    let platform = "youtube";

    if (isUrl) {
      platform = detectPlatform(query);

      if (platform === "unknown") {
        return interaction.reply({
          content:
            "❌ Unsupported URL. Supported platforms:\n" +
            "• YouTube (youtube.com, youtu.be)\n" +
            "• YouTube Music (music.youtube.com)\n" +
            "• Spotify (spotify.com) *less accurate*\n" +
            "• SoundCloud (soundcloud.com)",
          ephemeral: true,
        });
      }
    }

    const platformInfo = {
      youtube: "🎵 YouTube",
      youtube_music: "🎵 YouTube Music",
      spotify: '🎵 Spotify (less accurate)',
      soundcloud: "🎵 SoundCloud",
    };

    await interaction.deferReply();

    try {
      const platform_display = platformInfo[platform] || "🎵";

      if (isUrl) {
        await interaction.editReply(`${platform_display} Processing link...`);
      } else {
        await interaction.editReply(
          `${platform_display} Searching for: "${query}"...`
        );
      }

      // Call player service with additional information
      return await player.play(interaction, query, {
        platform: platform,
        isUrl: isUrl,
        originalQuery: query,
      });
    } catch (error) {
      console.error("Error in play command:", error);

      let errorMessage = "❌ Error playing music.";

      if (platform === "spotify") {
        errorMessage =
          "❌ Error with Spotify. Note: Spotify tends to be less accurate. Try YouTube instead.";
      } else if (platform === "soundcloud") {
        errorMessage =
          "❌ Error with SoundCloud. Make sure the link is public.";
      }

      return interaction.editReply(errorMessage);
    }
  },
};
