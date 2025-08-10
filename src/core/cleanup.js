const fs = require("fs");
const { getSession, deleteSession, closeAndUnlink } = require("./sessionManager");
const { log } = require("../utils/logger");

async function cleanupSession(guildId) {
  const session = getSession(guildId);
  if (!session) return;

  try {
    if (session.currentPlayer) {
      session.currentPlayer.removeAllListeners();
      session.currentPlayer.stop();
      session.currentPlayer = null;
    }
    if (session.connection) {
      session.connection.destroy();
      session.connection = null;
    }

    // Best-effort: remove temp files registered in DB
    await new Promise(resolve => {
      session.db.all("SELECT file_path FROM queue", [], (err, rows) => {
        if (!err && rows) {
          rows.forEach(({ file_path }) => {
            try { if (fs.existsSync(file_path)) fs.unlinkSync(file_path); } catch {}
          });
        }
        resolve();
      });
    });

    await closeAndUnlink(session);
  } catch (e) {
    // ignore
  } finally {
    deleteSession(guildId);
    log(`Session cleaned for guild ${guildId}`);
  }
}

module.exports = { cleanupSession };
