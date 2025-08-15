const { getUserUploadStats } = require("../core/fileSessionManager");

/**
 * Format bytes to human readable string
 */
function formatBytes(bytes) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

/**
 * Validate URL format
 */
function isValidUrl(string) {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;
  }
}

/**
 * Get file extension from filename
 */
function getFileExtension(filename) {
  return filename.split(".").pop().toLowerCase();
}

/**
 * Check if file type is supported
 */
function isSupportedFileType(filename, allowedTypes = null) {
  const extension = getFileExtension(filename);

  // If no specific types are provided, allow most common types
  if (!allowedTypes) {
    const commonTypes = [
      "jpg",
      "jpeg",
      "png",
      "gif",
      "bmp",
      "webp",
      "svg", // Images
      "mp4",
      "avi",
      "mov",
      "wmv",
      "flv",
      "webm",
      "mkv", // Videos
      "mp3",
      "wav",
      "flac",
      "aac",
      "ogg",
      "wma", // Audio
      "pdf",
      "doc",
      "docx",
      "txt",
      "rtf",
      "odt", // Documents
      "zip",
      "rar",
      "7z",
      "tar",
      "gz", // Archives
      "exe",
      "msi",
      "deb",
      "rpm",
      "dmg", // Executables
      "json",
      "xml",
      "csv",
      "yaml",
      "yml",
      "ini", // Data files
      "js",
      "css",
      "html",
      "php",
      "py",
      "java",
      "cpp",
      "c",
      "h", // Code files
    ];
    return commonTypes.includes(extension);
  }

  return allowedTypes.includes(extension);
}

/**
 * Generate safe filename
 */
function sanitizeFilename(filename) {
  // Remove or replace dangerous characters
  return filename
    .replace(/[<>:"/\\|?*]/g, "_")
    .replace(/\s+/g, "_")
    .substring(0, 255); // Limit length
}

/**
 * Check file size limits based on service
 */
function checkFileSizeLimit(size, service) {
  const limits = {
    catbox: 200 * 1024 * 1024, // 200MB for Catbox
    litterbox: 1024 * 1024 * 1024, // 1GB for Litterbox
  };

  const limit = limits[service.toLowerCase()];
  if (!limit) return true; // No limit defined

  return size <= limit;
}

/**
 * Get MIME type from file extension
 */
function getMimeType(filename) {
  const extension = getFileExtension(filename);
  const mimeTypes = {
    // Images
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    bmp: "image/bmp",
    webp: "image/webp",
    svg: "image/svg+xml",

    // Videos
    mp4: "video/mp4",
    avi: "video/x-msvideo",
    mov: "video/quicktime",
    wmv: "video/x-ms-wmv",
    flv: "video/x-flv",
    webm: "video/webm",
    mkv: "video/x-matroska",

    // Audio
    mp3: "audio/mpeg",
    wav: "audio/wav",
    flac: "audio/flac",
    aac: "audio/aac",
    ogg: "audio/ogg",
    wma: "audio/x-ms-wma",

    // Documents
    pdf: "application/pdf",
    doc: "application/msword",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    txt: "text/plain",
    rtf: "application/rtf",
    odt: "application/vnd.oasis.opendocument.text",

    // Archives
    zip: "application/zip",
    rar: "application/vnd.rar",
    "7z": "application/x-7z-compressed",
    tar: "application/x-tar",
    gz: "application/gzip",

    // Code files
    js: "application/javascript",
    css: "text/css",
    html: "text/html",
    json: "application/json",
    xml: "application/xml",
    csv: "text/csv",
  };

  return mimeTypes[extension] || "application/octet-stream";
}

/**
 * Format upload stats for display
 */
async function formatUserStats(userId) {
  const stats = await getUserUploadStats(userId);

  return {
    totalUploads: stats.total_uploads || 0,
    totalSize: formatBytes(stats.total_size_bytes || 0),
    lastUpload: stats.last_upload_date
      ? new Date(stats.last_upload_date).toLocaleString()
      : "Never",
    memberSince: stats.created_at
      ? new Date(stats.created_at).toLocaleDateString()
      : "Unknown",
  };
}

/**
 * Duration helpers for Litterbox
 */
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

function getDurationText(duration) {
  const texts = {
    "1h": "1 Hour",
    "12h": "12 Hours",
    "24h": "1 Day",
    "72h": "3 Days",
  };
  return texts[duration] || texts["1h"];
}

/**
 * Extract filename from URL
 */
function extractFilenameFromUrl(url) {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    const filename = pathname.split("/").pop();

    // If no filename or extension, generate one
    if (!filename || !filename.includes(".")) {
      return `download_${Date.now()}.bin`;
    }

    return filename;
  } catch {
    return `download_${Date.now()}.bin`;
  }
}

/**
 * Generate file hash from buffer
 */
function generateFileHash(buffer, algorithm = "sha256") {
  const crypto = require("crypto");
  return crypto.createHash(algorithm).update(buffer).digest("hex");
}

/**
 * Check if file already exists by hash (for deduplication)
 */
async function checkFileExists(userId, fileHash) {
  const { getUserFiles } = require("../core/fileSessionManager");
  const files = await getUserFiles(userId, { limit: 1000 });

  return files.find((file) => file.file_hash === fileHash);
}

/**
 * Create upload progress message
 */
function createProgressEmbed(filename, progress = 0) {
  const { EmbedBuilder } = require("discord.js");

  const progressBar =
    "█".repeat(Math.floor(progress / 10)) +
    "░".repeat(10 - Math.floor(progress / 10));

  return new EmbedBuilder()
    .setColor("#ffa500")
    .setTitle("📤 Uploading File")
    .setDescription(
      `Uploading: **${filename}**\n\`${progressBar}\` ${progress}%`
    )
    .setTimestamp();
}

module.exports = {
  formatBytes,
  isValidUrl,
  getFileExtension,
  isSupportedFileType,
  sanitizeFilename,
  checkFileSizeLimit,
  getMimeType,
  formatUserStats,
  getDurationMs,
  getDurationSeconds,
  getDurationText,
  extractFilenameFromUrl,
  generateFileHash,
  checkFileExists,
  createProgressEmbed,
};
