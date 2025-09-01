const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  EmbedBuilder,
  InteractionContextType,
} = require("discord.js");
const {
  activeVotes,
  insertHistory,
} = require("../../services/moderation/votekickService");
const { error } = require("../../utils/logger");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("votekick")
    .setDescription("Start a vote to remove someone from the voice channel (or from the server if unanimous).")
    .addUserOption(o =>
      o.setName("user").setDescription("Target user").setRequired(true)
    )
    .addIntegerOption(o =>
      o
        .setName("duration_seconds")
        .setDescription("Vote duration in seconds (15–300, default 60).")
        .setMinValue(15)
        .setMaxValue(300)
    )
    .setContexts([InteractionContextType.Guild]),

  async execute(interaction) {
    try {
      const guild = interaction.guild;
      const target = interaction.options.getUser("user", true);
      const duration = interaction.options.getInteger("duration_seconds") ?? 60;

      if (target.bot)
        return interaction.reply({ content: "You cannot start a votekick against a bot.", ephemeral: true });
      if (target.id === interaction.user.id)
        return interaction.reply({ content: "You cannot votekick yourself.", ephemeral: true });

      const targetMember = await guild.members.fetch(target.id).catch(() => null);
      if (!targetMember)
        return interaction.reply({ content: "Target user not found in this server.", ephemeral: true });

      const vc = targetMember.voice?.channel;
      if (!vc)
        return interaction.reply({ content: "The target user is not in a voice channel.", ephemeral: true });

      const me = guild.members.me;
      const botPerms = vc.permissionsFor(me);
      if (!botPerms?.has(PermissionFlagsBits.MoveMembers)) {
        return interaction.reply({ content: "I am missing the **Move Members** permission to disconnect users.", ephemeral: true });
      }
      const canKick = guild.members.me.permissions.has(PermissionFlagsBits.KickMembers);

      const key = `${guild.id}:${vc.id}:${target.id}`;
      if (activeVotes.has(key)) {
        return interaction.reply({ content: "There is already an active votekick for this user in this voice channel.", ephemeral: true });
      }

      const humanInVC = vc.members.filter(m => !m.user.bot);
      const totalHumans = humanInVC.size;
      if (totalHumans <= 1) {
        return interaction.reply({ content: "Not enough human members in the voice channel to start a votekick.", ephemeral: true });
      }
      const halfThreshold = Math.ceil(totalHumans / 2);

      await interaction.deferReply();

      const baseEmbed = new EmbedBuilder()
        .setTitle("Votekick Started")
        .setColor(0xffa500)
        .setDescription([
          `Target: <@${target.id}>`,
          `React with ✅ to vote.`,
          `Members (excluding bots): **${totalHumans}**`,
          `Threshold (50%): **${halfThreshold}**`,
          `Time remaining: **${duration}s**`,
        ].join("\n"));

      const msg = await interaction.editReply({ embeds: [baseEmbed] });
      await msg.react("✅").catch(() => {});

      const voters = new Set();
      activeVotes.set(key, { startedAt: Date.now(), voters });

      const leaveWatcher = (oldState, newState) => {
        if (oldState.member?.id !== target.id && newState.member?.id !== target.id) return;
        const stillIn = newState.channelId === vc.id;
        if (!stillIn) {
          try { reactionCollector.stop("target_left"); } catch {}
        }
      };
      interaction.client.on("voiceStateUpdate", leaveWatcher);

      const reactionFilter = (reaction, user) =>
        reaction.emoji.name === "✅" && !user.bot && humanInVC.has(user.id);

      const reactionCollector = msg.createReactionCollector({
        filter: reactionFilter,
        time: duration * 1000,
      });

      const intervalId = setInterval(async () => {
        const elapsed = Math.floor((Date.now() - activeVotes.get(key).startedAt) / 1000);
        const remain = Math.max(0, duration - elapsed);
        const upd = EmbedBuilder.from(baseEmbed).setDescription([
          `Target: <@${target.id}>`,
          `React with ✅ to vote.`,
          `Members (excluding bots): **${totalHumans}**`,
          `Votes: **${voters.size}/${totalHumans}**`,
          `Threshold (50%): **${halfThreshold}**`,
          `Time remaining: **${remain}s**`,
        ].join("\n"));
        await msg.edit({ embeds: [upd] }).catch(() => {});
      }, 5000);

      let decision = null;

      reactionCollector.on("collect", (_reaction, user) => {
        voters.add(user.id);

        if (voters.size >= totalHumans) {
          decision = "unanimous";
          reactionCollector.stop("unanimous");
        } else if (voters.size >= halfThreshold && voters.size < totalHumans) {
          decision = "half";
          reactionCollector.stop("half_reached");
        }
      });

      reactionCollector.on("end", async (_c, reason) => {
        clearInterval(intervalId);
        interaction.client.removeListener("voiceStateUpdate", leaveWatcher);
        activeVotes.delete(key);

        const save = async (actionType, result) => {
          await insertHistory({
            guildId: guild.id,
            targetUserId: target.id,
            targetUsername: target.tag ?? target.username,
            actionType,
            totalMembersVC: totalHumans,
            votesYes: voters.size,
            durationSeconds: duration,
            result,
          });
        };

        if (reason === "target_left") {
          await save("none", "aborted_left");
          return msg.reply("The votekick was cancelled because the target user left the voice channel.").catch(() => {});
        }

        if (decision === "half") {
          try {
            const fresh = await guild.members.fetch(target.id).catch(() => null);
            if (fresh?.voice?.channelId) {
              await fresh.voice.setChannel(null, "Votekick (>=50%)");
            }
            await save("disconnect", "success");
            return msg.reply("The minimum number of votes was reached. The user has been disconnected from the voice channel.").catch(() => {});
          } catch (e) {
            error("VK half disconnect", e);
            await save("none", "not_enough");
            return msg.reply("Could not disconnect the user (permissions/hierarchy issue).").catch(() => {});
          }
        }

        if (decision === "unanimous") {
          const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId("vk_only_voice")
              .setLabel("Disconnect from Voice Channel only")
              .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
              .setCustomId("vk_kick_server")
              .setLabel("Kick from Server")
              .setStyle(ButtonStyle.Danger)
              .setDisabled(!canKick)
          );

          const endEmbed = new EmbedBuilder()
            .setColor(0x00cc99)
            .setDescription(`Unanimous votekick against <@${target.id}>. Voters, please choose an action.`);

          const choiceMsg = await msg.reply({ embeds: [endEmbed], components: [row] });

          const btnCollector = choiceMsg.createMessageComponentCollector({
            time: 30_000,
            filter: i => voters.has(i.user.id),
          });

          let resolved = false;

          btnCollector.on("collect", async (i) => {
            if (resolved) return i.reply({ content: "An action has already been chosen.", ephemeral: true });
            resolved = true;

            try {
              if (i.customId === "vk_only_voice") {
                const fresh = await guild.members.fetch(target.id).catch(() => null);
                if (fresh?.voice?.channelId) {
                  await fresh.voice.setChannel(null, "Unanimous votekick (voice only)");
                }
                await i.update({ content: "User disconnected from the voice channel (unanimous decision).", components: [], embeds: [] });
                await save("disconnect", "unanimous_disconnect");
              } else if (i.customId === "vk_kick_server") {
                if (!canKick) {
                  await i.reply({ content: "I do not have the **Kick Members** permission.", ephemeral: true });
                  resolved = false;
                  return;
                }
                const fresh = await guild.members.fetch(target.id).catch(() => null);
                if (!fresh) throw new Error("Member not found");
                await fresh.kick("Unanimous votekick");
                await i.update({ content: "User kicked from the server (unanimous decision).", components: [], embeds: [] });
                await save("kick", "unanimous_kick");
              }
            } catch (e) {
              error("VK unanimous action", e);
              await i.update({ content: "Could not perform the action (permissions/hierarchy issue).", components: [], embeds: [] }).catch(() => {});
              await save("none", "not_enough");
            }
            btnCollector.stop("resolved");
          });

          btnCollector.on("end", async (_c, r) => {
            if (!resolved && r !== "resolved") {
              await choiceMsg.edit({ content: "Time to choose an action has expired.", components: [], embeds: [] }).catch(() => {});
              await save("none", "timeout");
            }
          });

          return;
        }

        if (!decision) {
          await save("none", "timeout");
          return msg.reply("Voting time has expired. Minimum votes not reached, votekick cancelled.").catch(() => {});
        }
      });
    } catch (e) {
      error("VK execute", e);
      return interaction.reply({ content: "An error occurred while starting the votekick.", ephemeral: true }).catch(() => {});
    }
  },
};
