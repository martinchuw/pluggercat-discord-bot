const { UPLOAD_SERVICES } = require("../services/upload/uploadManager");

module.exports = {
  DEFAULT_SERVICE: UPLOAD_SERVICES.CATBOX,

  SERVICES: {
    [UPLOAD_SERVICES.CATBOX]: {
      name: "Catbox",
      description: "Permanent file storage",
      maxFileSize: 200 * 1024 * 1024, // 200MB
      supportedFeatures: [
        "permanent",
        "albums",
        "url_upload",
        "file_management",
      ],
      userHashRequired: false, // Optional for basic uploads
    },
    [UPLOAD_SERVICES.LITTERBOX]: {
      name: "Litterbox",
      description: "Temporary file storage",
      maxFileSize: 1024 * 1024 * 1024, // 1GB
      supportedFeatures: ["temporary", "duration_control"],
      durations: ["1h", "12h", "24h", "72h"],
    },
  },

  LIMITS: {
    // Discord attachment limit for bots
    DISCORD_MAX_SIZE: 25 * 1024 * 1024, // 25MB

    // Maximum files per user to track
    MAX_USER_FILES: 1000,

    // Allowed file types (empty array means all types allowed)
    ALLOWED_TYPES: [], // ['jpg', 'png', 'gif', 'mp4', 'pdf'] etc.

    // Blocked file types
    BLOCKED_TYPES: ["exe", "scr", "bat", "cmd", "com", "pif", "vbs", "jar"],
  },

  // Database configuration
  DATABASE: {
    // Directory for user file databases
    FILES_DB_DIR: "data",

    // Auto cleanup expired files (in hours)
    CLEANUP_INTERVAL: 24,

    // Keep deleted file records for X days
    KEEP_DELETED_RECORDS: 30,
  },

  // Upload behavior
  BEHAVIOR: {
    // Save upload history
    SAVE_HISTORY: true,

    // Check for duplicate files (by hash)
    CHECK_DUPLICATES: true,

    // Auto-cleanup temp directory
    CLEANUP_TEMP_FILES: true,

    // Maximum concurrent uploads per user
    MAX_CONCURRENT_UPLOADS: 3,
  },

  // User hash configuration for Catbox premium features
  CATBOX: {
    // Set this if you have a Catbox user hash for enhanced features
    USER_HASH: process.env.CATBOX_USER_HASH || null,

    // Enable album features
    ENABLE_ALBUMS: true,

    // Enable file management features
    ENABLE_FILE_MANAGEMENT: true,
  },

  // Embed colors
  COLORS: {
    SUCCESS: "#00ff00",
    ERROR: "#ff0000",
    WARNING: "#ffa500",
    INFO: "#0099ff",
    UPLOAD: "#9966ff",
  },
};
