const { Client, GatewayIntentBits, Partials, Collection } = require("discord.js");
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
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.DirectMessageReactions,
  ],
  partials: [
    Partials.Message,
    Partials.Channel,
    Partials.Reaction,
    Partials.User,
    Partials.GuildMember,
  ],
  sweepers: {
    messages: {
      interval: 60,
      lifetime: 60 * 10,
    },
  },
});

client.context = { cleanupSession };

const commands = loadCommands();
client.commands = commands;

const commandsJson = [...commands.values()].map(c => c.data.toJSON());

client.once("ready", () => onReady(client, commandsJson));
client.on("interactionCreate", onInteractionCreate(commands));
client.on("voiceStateUpdate", onVoiceStateUpdate(client, cleanupSession));

client.on("error", (e) => error("Client error:", e));
client.on("shardError", (e) => error("Shard error:", e));
process.on("unhandledRejection", (e) => error("Unhandled promise rejection:", e));

process.on("SIGINT", async () => {
  log("Shutting down...");
  try {
    await client.destroy();
  } finally {
    process.exit(0);
  }
});

client.login(DISCORD_TOKEN);
