const { ActivityType, REST, Routes } = require("discord.js");
const { log, error } = require("../utils/logger");

async function onReady(client, commandsJson) {
  log(`Logged in as ${client.user.tag}`);
  try {
    await client.user.setPresence({
      activities: [{ name: "/play to stream music", type: ActivityType.Listening }],
      status: "online"
    });
  } catch (e) {
    error("Failed to set presence:", e);
  }

  // Global registration of slash commands
  try {
    const rest = new REST({ version: "10" }).setToken(client.token);
    await rest.put(Routes.applicationCommands(client.user.id), { body: commandsJson });
    log("Slash commands registered.");
  } catch (e) {
    error("Slash registration failed:", e);
  }
}

module.exports = { onReady };
