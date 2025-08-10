const { Client, GatewayIntentBits, Collection } = require("discord.js");
const fs = require("fs");
const path = require("path");
const { DISCORD_TOKEN } = require("./config");
const { loadCommands } = require("./core/commandHandler");
const { onReady } = require("./events/ready");
const { onInteractionCreate } = require("./events/interactionCreate");
const { onVoiceStateUpdate } = require("./events/voiceStateUpdate");
const { cleanupSession } = require("./core/cleanup");
const { log, error } = require("./utils/logger");

if (!DISCORD_TOKEN) {
  error("Missing DISCORD_TOKEN. Set it in .env or token.txt");
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.DirectMessages
  ]
});

// Attach a shared context to client (useful for passing utilities)
client.context = { cleanupSession };

// Load commands
const commands = loadCommands();
client.commands = commands;

// Build JSON for registration
const commandsJson = [...commands.values()].map(c => c.data.toJSON());

// Wire events
client.once("ready", () => onReady(client, commandsJson));
client.on("interactionCreate", onInteractionCreate(commands));
client.on("voiceStateUpdate", onVoiceStateUpdate(client, cleanupSession));

// Graceful shutdown
process.on("SIGINT", async () => {
  log("Shutting down...");
  try {
    // No global cleanup beyond per-guild sessions since they are on-demand
  } finally {
    process.exit(0);
  }
});

client.login(DISCORD_TOKEN);
