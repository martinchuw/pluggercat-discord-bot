function onVoiceStateUpdate(client, cleanupSession) {
  return (oldState, newState) => {
    if (oldState.member && oldState.member.id === client.user.id) {
      if (!newState.channel) {
        cleanupSession(oldState.guild.id);
      }
    }
  };
}

module.exports = { onVoiceStateUpdate };
