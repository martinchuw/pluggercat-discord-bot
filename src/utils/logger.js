const prefix = "[BOT]";

function log(...args) {
  console.log(prefix, ...args);
}
function warn(...args) {
  console.warn(prefix, ...args);
}
function error(...args) {
  console.error(prefix, ...args);
}

module.exports = { log, warn, error };
