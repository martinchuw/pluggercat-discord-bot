# Discord Music Bot (Modular)

A modular Discord bot focused on music playback using `discord.js` v14 and `@discordjs/voice`.
Audio is fetched via the external tool **yt-dlp** (must be installed in the host OS).

## Key features
- Slash commands (`/play`, `/pause`, `/resume`, `/skip`, `/stop`, `/queue`)
- Per-guild session with SQLite-backed queue metadata
- Clean folder layout (commands, services, core, utils, events, config)
- Extensible architecture ready for additional modules

## Requirements
- Node.js 18+
- `yt-dlp` available in PATH
- A Discord application bot token
- (Linux recommended for audio performance)

## Setup
```bash
# 1) Install dependencies
npm i

# 2) Configure environment
cp .env.example .env
# Then edit .env and set DISCORD_TOKEN

# Optionally update allowed users:
# Edit data/allowed_users.json with your Discord user IDs.

# 3) Run
npm run start
# or
npm run dev
```

## Notes
- The bot dynamically registers slash commands on startup.
- Audio temp files are written to `tempmusic/` and auto-cleaned when possible.
- You can add more commands in `src/commands/<module>` and services in `src/services`.
