const path = require("path");
const sqlite3 = require("sqlite3").verbose();
const { ROOT_DIR } = require("../config");
const { error } = require("../utils/logger");

const guildSessions = new Map();

function createSession(guildId) {
  const dbPath = path.join(ROOT_DIR, `session_${guildId}.db`);
  const db = new sqlite3.Database(dbPath);

  db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      video_id TEXT NOT NULL,
      url TEXT NOT NULL,
      file_path TEXT NOT NULL,
      download_count INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
  });

  return {
    db,
    dbPath,
    currentPlayer: null,
    connection: null,
    isPlaying: false,
    currentSongId: null,
    queue: []
  };
}

function getSession(guildId) {
  if (!guildSessions.has(guildId)) {
    guildSessions.set(guildId, createSession(guildId));
  }
  return guildSessions.get(guildId);
}

function deleteSession(guildId) {
  guildSessions.delete(guildId);
}

function withDb(session, sql, params = []) {
  return new Promise((resolve, reject) => {
    session.db.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

function runDb(session, sql, params = []) {
  return new Promise((resolve, reject) => {
    session.db.run(sql, params, function (err) {
      if (err) return reject(err);
      resolve(this);
    });
  });
}

async function closeAndUnlink(session) {
  return new Promise((resolve) => {
    session.db.close(() => resolve());
  });
}

module.exports = { getSession, deleteSession, withDb, runDb, closeAndUnlink };
