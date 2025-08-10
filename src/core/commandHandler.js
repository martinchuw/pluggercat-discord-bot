const fs = require("fs");
const path = require("path");

function loadCommands() {
  const commands = new Map();
  const baseDir = path.join(__dirname, "..", "commands");

  const stack = [baseDir];
  while (stack.length) {
    const dir = stack.pop();
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        stack.push(full);
      } else if (entry.isFile() && entry.name.endsWith(".js")) {
        const mod = require(full);
        if (mod?.data?.name && typeof mod.execute === "function") {
          commands.set(mod.data.name, mod);
        }
      }
    }
  }
  return commands;
}

module.exports = { loadCommands };
