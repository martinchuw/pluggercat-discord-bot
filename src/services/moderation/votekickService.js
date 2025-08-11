const { getSession, runDb, withDb } = require("../../core/sessionManager");
const { error } = require("../../utils/logger");

// key = `${guildId}:${vcId}:${targetId}` -> { startedAt:number, voters:Set<string> }
const activeVotes = new Map();

async function ensureSchema(guildId) {
  const session = getSession(guildId);
  const sql = `
    CREATE TABLE IF NOT EXISTS votekick_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      target_user_id TEXT NOT NULL,
      target_username TEXT NOT NULL,
      action_type TEXT NOT NULL,          -- 'disconnect'|'kick'|'none'
      total_members_vc INTEGER NOT NULL,
      votes_yes INTEGER NOT NULL,
      duration_seconds INTEGER NOT NULL,
      result TEXT NOT NULL,               -- 'success'|'unanimous_disconnect'|'unanimous_kick'|'timeout'|'not_enough'|'aborted_left'
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_vkh_guild ON votekick_history(guild_id);
    CREATE INDEX IF NOT EXISTS idx_vkh_target ON votekick_history(target_user_id);
    CREATE INDEX IF NOT EXISTS idx_vkh_guild_target ON votekick_history(guild_id, target_user_id);
  `;
  await runDb(session, sql).catch((err) => error("VK ensureSchema", err));
}

async function insertHistory({
  guildId,
  targetUserId,
  targetUsername,
  actionType,
  totalMembersVC,
  votesYes,
  durationSeconds,
  result,
}) {
  await ensureSchema(guildId);
  const session = getSession(guildId);
  const sql = `
    INSERT INTO votekick_history
      (guild_id, target_user_id, target_username, action_type,
        total_members_vc, votes_yes, duration_seconds, result)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;
  return runDb(session, sql, [
    guildId,
    targetUserId,
    targetUsername,
    actionType,
    totalMembersVC,
    votesYes,
    durationSeconds,
    result,
  ]).catch((err) => error("VK insertHistory", err));
}

async function getLeaderboard(guildId, top = 10) {
  await ensureSchema(guildId);
  const session = getSession(guildId);
  const sql = `
    SELECT target_user_id AS userId,
          target_username AS username,
          COUNT(*) AS total_events,
          MAX(created_at) AS last_at
    FROM votekick_history
    WHERE guild_id = ? AND action_type IN ('disconnect','kick')
    GROUP BY target_user_id, target_username
    ORDER BY total_events DESC, last_at DESC
    LIMIT ?
  `;
  return withDb(session, sql, [guildId, top]);
}

async function getUserHistory(guildId, userId, limit = 10) {
  await ensureSchema(guildId);
  const session = getSession(guildId);
  const sql = `
    SELECT created_at, action_type, total_members_vc, votes_yes, result
    FROM votekick_history
    WHERE guild_id = ? AND target_user_id = ?
    ORDER BY created_at DESC
    LIMIT ?
  `;
  return withDb(session, sql, [guildId, userId, limit]);
}

module.exports = {
  activeVotes,
  ensureSchema,
  insertHistory,
  getLeaderboard,
  getUserHistory,
};
