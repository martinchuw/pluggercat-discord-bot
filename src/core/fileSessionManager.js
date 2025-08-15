const path = require("path");
const sqlite3 = require("sqlite3").verbose();
const { ROOT_DIR } = require("../config");
const { error, info } = require("../utils/logger");

const fileSessions = new Map();

function createFileSession(userId) {
  const dbPath = path.join(ROOT_DIR, "data", `user_files_${userId}.db`);
  const db = new sqlite3.Database(dbPath);

  db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS uploaded_files (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      original_filename TEXT NOT NULL,
      file_url TEXT NOT NULL,
      file_size INTEGER,
      mime_type TEXT,
      upload_service TEXT NOT NULL,
      upload_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      expires_at DATETIME,
      is_temporary BOOLEAN DEFAULT 0,
      file_hash TEXT,
      guild_id TEXT,
      channel_id TEXT,
      message_id TEXT
    )`);

    // File metadata table for additional info
    db.run(`CREATE TABLE IF NOT EXISTS file_metadata (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      file_id INTEGER,
      metadata_key TEXT NOT NULL,
      metadata_value TEXT,
      FOREIGN KEY (file_id) REFERENCES uploaded_files (id) ON DELETE CASCADE
    )`);

    // User upload stats
    db.run(`CREATE TABLE IF NOT EXISTS user_upload_stats (
      user_id TEXT PRIMARY KEY,
      total_uploads INTEGER DEFAULT 0,
      total_size_bytes INTEGER DEFAULT 0,
      last_upload_date DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Create indexes for better performance
    db.run(
      `CREATE INDEX IF NOT EXISTS idx_uploaded_files_user_id ON uploaded_files(user_id)`
    );
    db.run(
      `CREATE INDEX IF NOT EXISTS idx_uploaded_files_upload_date ON uploaded_files(upload_date)`
    );
    db.run(
      `CREATE INDEX IF NOT EXISTS idx_uploaded_files_service ON uploaded_files(upload_service)`
    );
    db.run(
      `CREATE INDEX IF NOT EXISTS idx_file_metadata_file_id ON file_metadata(file_id)`
    );
  });

  return {
    db,
    dbPath,
    userId,
  };
}

function getFileSession(userId) {
  if (!fileSessions.has(userId)) {
    fileSessions.set(userId, createFileSession(userId));
    info(`Created file session for user: ${userId}`);
  }
  return fileSessions.get(userId);
}

function deleteFileSession(userId) {
  const session = fileSessions.get(userId);
  if (session) {
    session.db.close();
    fileSessions.delete(userId);
    info(`Deleted file session for user: ${userId}`);
  }
}

function withFileDb(session, sql, params = []) {
  return new Promise((resolve, reject) => {
    session.db.all(sql, params, (err, rows) => {
      if (err) {
        error(`Database query error: ${err.message}`);
        return reject(err);
      }
      resolve(rows);
    });
  });
}

function runFileDb(session, sql, params = []) {
  return new Promise((resolve, reject) => {
    session.db.run(sql, params, function (err) {
      if (err) {
        error(`Database run error: ${err.message}`);
        return reject(err);
      }
      resolve(this);
    });
  });
}

async function closeFileSession(session) {
  return new Promise((resolve) => {
    session.db.close((err) => {
      if (err) {
        error(`Error closing file database: ${err.message}`);
      }
      resolve();
    });
  });
}

// File management functions
async function saveUploadedFile(userId, fileData) {
  const session = getFileSession(userId);

  try {
    // Insert file record
    const fileResult = await runFileDb(
      session,
      `
      INSERT INTO uploaded_files (
        user_id, original_filename, file_url, file_size, mime_type, 
        upload_service, expires_at, is_temporary, file_hash, 
        guild_id, channel_id, message_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
      [
        userId,
        fileData.originalFilename,
        fileData.fileUrl,
        fileData.fileSize || null,
        fileData.mimeType || null,
        fileData.uploadService,
        fileData.expiresAt || null,
        fileData.isTemporary || 0,
        fileData.fileHash || null,
        fileData.guildId || null,
        fileData.channelId || null,
        fileData.messageId || null,
      ]
    );

    const fileId = fileResult.lastID;

    // Save metadata if provided
    if (fileData.metadata && Object.keys(fileData.metadata).length > 0) {
      for (const [key, value] of Object.entries(fileData.metadata)) {
        await runFileDb(
          session,
          `
          INSERT INTO file_metadata (file_id, metadata_key, metadata_value)
          VALUES (?, ?, ?)
        `,
          [fileId, key, JSON.stringify(value)]
        );
      }
    }

    // Update user stats
    await updateUserStats(userId, fileData.fileSize || 0);

    info(`File saved for user ${userId}: ${fileData.originalFilename}`);
    return fileId;
  } catch (err) {
    error(`Error saving uploaded file: ${err.message}`);
    throw err;
  }
}

async function getUserFiles(userId, options = {}) {
  const session = getFileSession(userId);

  try {
    let sql = `
      SELECT uf.*, GROUP_CONCAT(fm.metadata_key || ':' || fm.metadata_value) as metadata
      FROM uploaded_files uf
      LEFT JOIN file_metadata fm ON uf.id = fm.file_id
      WHERE uf.user_id = ?
    `;

    const params = [userId];

    // Add filters
    if (options.service) {
      sql += ` AND uf.upload_service = ?`;
      params.push(options.service);
    }

    if (options.guildId) {
      sql += ` AND uf.guild_id = ?`;
      params.push(options.guildId);
    }

    if (options.isTemporary !== undefined) {
      sql += ` AND uf.is_temporary = ?`;
      params.push(options.isTemporary ? 1 : 0);
    }

    sql += ` GROUP BY uf.id ORDER BY uf.upload_date DESC`;

    if (options.limit) {
      sql += ` LIMIT ?`;
      params.push(options.limit);
    }

    const files = await withFileDb(session, sql, params);

    // Parse metadata
    return files.map((file) => ({
      ...file,
      metadata: file.metadata
        ? Object.fromEntries(
            file.metadata.split(",").map((item) => {
              const [key, value] = item.split(":");
              try {
                return [key, JSON.parse(value)];
              } catch {
                return [key, value];
              }
            })
          )
        : {},
    }));
  } catch (err) {
    error(`Error getting user files: ${err.message}`);
    throw err;
  }
}

async function deleteUserFile(userId, fileId) {
  const session = getFileSession(userId);

  try {
    const result = await runFileDb(
      session,
      `
      DELETE FROM uploaded_files 
      WHERE id = ? AND user_id = ?
    `,
      [fileId, userId]
    );

    if (result.changes > 0) {
      info(`File deleted for user ${userId}: ${fileId}`);
      return true;
    }
    return false;
  } catch (err) {
    error(`Error deleting user file: ${err.message}`);
    throw err;
  }
}

async function getUserUploadStats(userId) {
  const session = getFileSession(userId);

  try {
    const stats = await withFileDb(
      session,
      `
      SELECT * FROM user_upload_stats WHERE user_id = ?
    `,
      [userId]
    );

    return (
      stats[0] || {
        user_id: userId,
        total_uploads: 0,
        total_size_bytes: 0,
        last_upload_date: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
    );
  } catch (err) {
    error(`Error getting user upload stats: ${err.message}`);
    throw err;
  }
}

async function updateUserStats(userId, fileSizeBytes) {
  const session = getFileSession(userId);

  try {
    await runFileDb(
      session,
      `
      INSERT OR REPLACE INTO user_upload_stats (
        user_id, total_uploads, total_size_bytes, last_upload_date, updated_at
      ) VALUES (
        ?,
        COALESCE((SELECT total_uploads FROM user_upload_stats WHERE user_id = ?), 0) + 1,
        COALESCE((SELECT total_size_bytes FROM user_upload_stats WHERE user_id = ?), 0) + ?,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      )
    `,
      [userId, userId, userId, fileSizeBytes]
    );
  } catch (err) {
    error(`Error updating user stats: ${err.message}`);
    throw err;
  }
}

module.exports = {
  getFileSession,
  deleteFileSession,
  withFileDb,
  runFileDb,
  closeFileSession,
  saveUploadedFile,
  getUserFiles,
  deleteUserFile,
  getUserUploadStats,
  updateUserStats,
};
