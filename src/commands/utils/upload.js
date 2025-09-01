const {
  SlashCommandBuilder,
  EmbedBuilder,
  AttachmentBuilder,
} = require("discord.js");
const {
  UploadManager,
  UPLOAD_SERVICES,
  FileLifetime,
} = require("../../services/upload/uploadManager");
const {
  saveUploadedFile,
  getUserFiles,
  deleteUserFile,
} = require("../../core/fileSessionManager");
const fs = require("fs").promises;
const path = require("path");
const crypto = require("crypto");

const uploadManager = new UploadManager();

module.exports = {
  data: new SlashCommandBuilder()
    .setName("upload")
    .setDescription("Upload files to cloud services")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("file")
        .setDescription("Upload a file attachment")
        .addAttachmentOption((option) =>
          option
            .setName("attachment")
            .setDescription("File to upload")
            .setRequired(true)
        )
        .addStringOption((option) =>
          option
            .setName("service")
            .setDescription("Upload service to use")
            .setRequired(false)
            .addChoices(
              { name: "Catbox (Permanent)", value: UPLOAD_SERVICES.CATBOX },
              {
                name: "Litterbox (Temporary)",
                value: UPLOAD_SERVICES.LITTERBOX,
              }
            )
        )
        .addStringOption((option) =>
          option
            .setName("duration")
            .setDescription("How long to keep the file (Litterbox only)")
            .setRequired(false)
            .addChoices(
              { name: "1 Hour", value: FileLifetime.OneHour },
              { name: "12 Hours", value: FileLifetime.TwelveHours },
              { name: "1 Day", value: FileLifetime.OneDay },
              { name: "3 Days", value: FileLifetime.ThreeDays }
            )
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("url")
        .setDescription("Upload a file from URL (Catbox only)")
        .addStringOption((option) =>
          option
            .setName("url")
            .setDescription("URL of the file to upload")
            .setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("list")
        .setDescription("List your uploaded files")
        .addStringOption((option) =>
          option
            .setName("service")
            .setDescription("Filter by upload service")
            .setRequired(false)
            .addChoices(
              { name: "Catbox", value: UPLOAD_SERVICES.CATBOX },
              { name: "Litterbox", value: UPLOAD_SERVICES.LITTERBOX }
            )
        )
        .addIntegerOption((option) =>
          option
            .setName("limit")
            .setDescription("Number of files to show (default: 10)")
            .setRequired(false)
            .setMinValue(1)
            .setMaxValue(50)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("delete")
        .setDescription("Delete one of your uploaded files from history")
        .addIntegerOption((option) =>
          option
            .setName("file_id")
            .setDescription("ID of the file to delete from history")
            .setRequired(true)
        )
    ),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();

    try {
      switch (subcommand) {
        case "file":
          await handleFileUpload(interaction);
          break;
        case "url":
          await handleUrlUpload(interaction);
          break;
        case "list":
          await handleListFiles(interaction);
          break;
        case "delete":
          await handleDeleteFile(interaction);
          break;
      }
    } catch (error) {
      console.error("Upload command error:", error);

      const errorEmbed = new EmbedBuilder()
        .setColor("#ff0000")
        .setTitle("❌ Upload Error")
        .setDescription(`Error: ${error.message}`)
        .setTimestamp();

      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ embeds: [errorEmbed], ephemeral: true });
      } else {
        await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
      }
    }
  },
};

async function handleFileUpload(interaction) {
  await interaction.deferReply();

  const attachment = interaction.options.getAttachment("attachment");
  const service =
    interaction.options.getString("service") || UPLOAD_SERVICES.CATBOX;
  const duration =
    interaction.options.getString("duration") || FileLifetime.OneHour;

  // Check file size (Discord limit is 25MB for bots)
  const maxSize = 25 * 1024 * 1024; // 25MB
  if (attachment.size > maxSize) {
    throw new Error("File size exceeds 25MB limit");
  }

  // Download file to temporary location
  const tempDir = path.join(process.cwd(), "temp");
  await fs.mkdir(tempDir, { recursive: true });

  const tempFilePath = path.join(
    tempDir,
    `${crypto.randomUUID()}_${attachment.name}`
  );

  try {
    // Download attachment
    const response = await fetch(attachment.url);
    const buffer = Buffer.from(await response.arrayBuffer());
    await fs.writeFile(tempFilePath, buffer);

    // Calculate file hash
    const fileHash = crypto.createHash("sha256").update(buffer).digest("hex");

    // Upload file
    const uploadOptions = {
      filePath: tempFilePath,
    };

    if (service === UPLOAD_SERVICES.LITTERBOX) {
      uploadOptions.duration = duration;
    }

    const result = await uploadManager.uploadFile(uploadOptions, service);

    // Save to user's file history
    const fileData = {
      originalFilename: attachment.name,
      fileUrl: result.url,
      fileSize: attachment.size,
      mimeType: attachment.contentType,
      uploadService: service,
      isTemporary: service === UPLOAD_SERVICES.LITTERBOX ? 1 : 0,
      expiresAt:
        service === UPLOAD_SERVICES.LITTERBOX
          ? new Date(Date.now() + getDurationMs(duration)).toISOString()
          : null,
      fileHash: fileHash,
      guildId: interaction.guildId,
      channelId: interaction.channelId,
      messageId: interaction.id,
      metadata: {
        discordAttachmentId: attachment.id,
        uploadedVia: "discord_command",
        duration: service === UPLOAD_SERVICES.LITTERBOX ? duration : null,
      },
    };

    const fileId = await saveUploadedFile(interaction.user.id, fileData);

    // Create success embed
    const embed = new EmbedBuilder()
      .setColor("#00ff00")
      .setTitle("✅ File Uploaded Successfully")
      .setDescription(`Your file has been uploaded to ${service.toUpperCase()}`)
      .addFields(
        { name: "📄 Filename", value: attachment.name, inline: true },
        { name: "📊 Size", value: formatBytes(attachment.size), inline: true },
        { name: "🔗 Service", value: service.toUpperCase(), inline: true },
        { name: "🌐 URL", value: `[Click here](${result.url})` },
        { name: "🆔 File ID", value: `${fileId}`, inline: true }
      )
      .setTimestamp();

    if (service === UPLOAD_SERVICES.LITTERBOX) {
      embed.addFields({
        name: "⏰ Expires",
        value: `<t:${
          Math.floor(Date.now() / 1000) + getDurationSeconds(duration)
        }:R>`,
        inline: true,
      });
    }

    await interaction.editReply({ embeds: [embed] });
  } finally {
    // Clean up temporary file
    try {
      await fs.unlink(tempFilePath);
    } catch (err) {
      console.error("Failed to delete temp file:", err);
    }
  }
}

async function handleUrlUpload(interaction) {
  await interaction.deferReply();

  const url = interaction.options.getString("url");

  // Basic URL validation
  if (!isValidUrl(url)) {
    throw new Error("Invalid URL provided");
  }

  const result = await uploadManager.uploadFromURL(
    { url },
    UPLOAD_SERVICES.CATBOX
  );

  // Extract filename from URL
  const filename = path.basename(new URL(url).pathname) || "uploaded_file";

  // Save to user's file history
  const fileData = {
    originalFilename: filename,
    fileUrl: result.url,
    uploadService: UPLOAD_SERVICES.CATBOX,
    isTemporary: 0,
    guildId: interaction.guildId,
    channelId: interaction.channelId,
    messageId: interaction.id,
    metadata: {
      sourceUrl: url,
      uploadedVia: "discord_command_url",
    },
  };

  const fileId = await saveUploadedFile(interaction.user.id, fileData);

  const embed = new EmbedBuilder()
    .setColor("#00ff00")
    .setTitle("✅ URL Uploaded Successfully")
    .setDescription("Your URL has been uploaded to Catbox")
    .addFields(
      { name: "📄 Filename", value: filename, inline: true },
      { name: "🔗 Service", value: "CATBOX", inline: true },
      { name: "🌐 New URL", value: `[Click here](${result.url})` },
      { name: "🆔 File ID", value: `${fileId}`, inline: true }
    )
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
}

async function handleListFiles(interaction) {
  await interaction.deferReply();

  const service = interaction.options.getString("service");
  const limit = interaction.options.getInteger("limit") || 10;

  const options = { limit };
  if (service) options.service = service;
  if (interaction.guildId) options.guildId = interaction.guildId;

  const files = await getUserFiles(interaction.user.id, options);

  if (files.length === 0) {
    const embed = new EmbedBuilder()
      .setColor("#ffa500")
      .setTitle("📁 No Files Found")
      .setDescription("You haven't uploaded any files yet.")
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
    return;
  }

  const embed = new EmbedBuilder()
    .setColor("#0099ff")
    .setTitle("📁 Your Uploaded Files")
    .setDescription(
      `Showing ${files.length} file(s)${
        service ? ` from ${service.toUpperCase()}` : ""
      }`
    );

  files.forEach((file, index) => {
    const uploadDate = new Date(file.upload_date);
    const expiresText = file.expires_at
      ? `\n⏰ Expires: <t:${Math.floor(
          new Date(file.expires_at).getTime() / 1000
        )}:R>`
      : "";

    embed.addFields({
      name: `${index + 1}. ${file.original_filename}`,
      value: `🆔 ID: ${
        file.id
      }\n🔗 Service: ${file.upload_service.toUpperCase()}\n📊 Size: ${
        file.file_size ? formatBytes(file.file_size) : "Unknown"
      }\n📅 Uploaded: <t:${Math.floor(
        uploadDate.getTime() / 1000
      )}:R>${expiresText}\n🌐 [View File](${file.file_url})`,
      inline: false,
    });
  });

  embed.setTimestamp();

  await interaction.editReply({ embeds: [embed] });
}

async function handleDeleteFile(interaction) {
  await interaction.deferReply();

  const fileId = interaction.options.getInteger("file_id");
  const deleted = await deleteUserFile(interaction.user.id, fileId);

  if (deleted) {
    const embed = new EmbedBuilder()
      .setColor("#00ff00")
      .setTitle("✅ File Deleted")
      .setDescription(
        `File with ID ${fileId} has been removed from your history.`
      )
      .setFooter({
        text: "Note: This only removes the file from your history, not from the upload service.",
      })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  } else {
    const embed = new EmbedBuilder()
      .setColor("#ff0000")
      .setTitle("❌ File Not Found")
      .setDescription(`No file with ID ${fileId} found in your history.`)
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  }
}

// Utility functions
function formatBytes(bytes) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

function isValidUrl(string) {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;
  }
}

function getDurationMs(duration) {
  const durations = {
    "1h": 60 * 60 * 1000,
    "12h": 12 * 60 * 60 * 1000,
    "24h": 24 * 60 * 60 * 1000,
    "72h": 72 * 60 * 60 * 1000,
  };
  return durations[duration] || durations["1h"];
}

function getDurationSeconds(duration) {
  return Math.floor(getDurationMs(duration) / 1000);
}
