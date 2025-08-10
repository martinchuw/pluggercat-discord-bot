const { ALLOWED_USERS } = require("../config");

function isUserAllowed(userId) {
  return ALLOWED_USERS.some(u => u.id === userId);
}

module.exports = { isUserAllowed };
