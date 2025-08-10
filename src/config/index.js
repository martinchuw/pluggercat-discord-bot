const fs = require("fs");
const path = require("path");
require("dotenv").config();

const ROOT_DIR = path.resolve(__dirname, "..", "..");
const DATA_DIR = path.join(ROOT_DIR, "data");
const TEMP_MUSIC_DIR = path.join(ROOT_DIR, "tempmusic");

if (!fs.existsSync(TEMP_MUSIC_DIR)) {
  fs.mkdirSync(TEMP_MUSIC_DIR, { recursive: true });
}

const TOKEN_FROM_ENV = process.env.DISCORD_TOKEN?.trim();
let allowedFromJson = [];
try {
  const raw = fs.readFileSync(path.join(DATA_DIR, "allowed_users.json"), "utf-8");
  const parsed = JSON.parse(raw);
  allowedFromJson = Array.isArray(parsed.allowed_users) ? parsed.allowed_users : [];
} catch (e) {
  // Optional file, ignore if missing
}

const allowedFromEnv = (process.env.ALLOWED_USERS || "")
  .split(",")
  .map(s => s.trim())
  .filter(Boolean)
  .map(id => ({ id }));

const ALLOWED_USERS = [...allowedFromJson, ...allowedFromEnv];

if (!TOKEN_FROM_ENV) {
  // Backward compatibility: token.txt support
  const tokenTxtPath = path.join(ROOT_DIR, "token.txt");
  if (fs.existsSync(tokenTxtPath)) {
    process.env.DISCORD_TOKEN = fs.readFileSync(tokenTxtPath, "utf-8").trim();
  }
}

module.exports = {
  ROOT_DIR,
  DATA_DIR,
  TEMP_MUSIC_DIR,
  DISCORD_TOKEN: process.env.DISCORD_TOKEN,
  ALLOWED_USERS
};
