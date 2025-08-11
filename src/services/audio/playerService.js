const fs = require("fs");
const path = require("path");
const {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  VoiceConnectionStatus,
} = require("@discordjs/voice");

const { TEMP_MUSIC_DIR } = require("../../config");
const { getSession, runDb } = require("../../core/sessionManager");
const extractVideoId = require("../../utils/extractVideoId");
const sleep = require("../../utils/sleep");
const { downloadWithYtDlp, downloadWithSpotDL } = require("./downloader");
const { log, error } = require("../../utils/logger");

const {
  isSpotifyUrl,
  isSoundcloudUrl,
  isYouTubeUrl,
  isYouTubeMusicUrl,
  detectPlatform,
} = require("../../utils/platformDetector");
const {
  getSpotifyMetaWithPuppeteer,
} = require("../../services/audio/spotifyPuppeteer");
const { ytSearchFirst } = require("../../services/audio/ytSearch");
const { getYtDlpInfo } = require("../../services/audio/ydlpInfo");

async function play(interaction, query, options = {}) {
  const guildId = interaction.guild.id;
  const voiceChannel = interaction.member?.voice?.channel;
  if (!voiceChannel)
    return interaction.editReply("You must join a voice channel first.");

  const session = getSession(guildId);

  let videoId;
  let effectiveUrl = query;
  const { platform, isUrl } = options;

  try {
    // Handle search terms (non-URLs)
    if (!isUrl) {
      const found = await ytSearchFirst(query);
      if (!found) throw new Error("No results found on YouTube");
      videoId = found.id;
      effectiveUrl = found.url;
    } else {
      // Handle URLs based on detected platform
      const detectedPlatform = platform || detectPlatform(query);
      
      switch (detectedPlatform) {
        case 'spotify':
          if (!isSpotifyUrl(query)) throw new Error("Invalid Spotify URL format");
          const meta = await getSpotifyMetaWithPuppeteer(query, {
            headless: "new",
            timeoutMs: 20000,
            retries: 1,
            waitUntil: "domcontentloaded",
            blockMedia: true,
          });
          if (!meta?.title) throw new Error("No title from Spotify via scraping");
          const searchQuery = meta.artist ? `${meta.title} ${meta.artist}` : meta.title;
          const found = await ytSearchFirst(searchQuery);
          if (!found) throw new Error("No YouTube equivalent found for Spotify track");
          videoId = found.id;
          effectiveUrl = found.url;
          break;

        case 'soundcloud':
          if (!isSoundcloudUrl(query)) throw new Error("Invalid SoundCloud URL format");
          const info = await getYtDlpInfo(query);
          if (!info?.id) throw new Error("No SoundCloud id from yt-dlp");
          videoId = `sc_${info.id}`;
          effectiveUrl = query;
          break;

        case 'youtube_music':
          if (!isYouTubeMusicUrl(query)) throw new Error("Invalid YouTube Music URL format");
          videoId = extractVideoId(query);
          if (!videoId) throw new Error("Could not extract video ID from YouTube Music URL");
          effectiveUrl = query;
          break;

        case 'youtube':
          if (!isYouTubeUrl(query)) throw new Error("Invalid YouTube URL format");
          videoId = extractVideoId(query);
          if (!videoId) throw new Error("Invalid YouTube URL");
          effectiveUrl = query;
          break;

        default:
          // Fallback: try to extract as YouTube URL
          videoId = extractVideoId(query);
          if (!videoId) throw new Error("Unsupported URL format");
          effectiveUrl = query;
      }
    }
  } catch (e) {
    error("Resolve error:", e);
    const platformName = platform || (isUrl ? detectPlatform(query) : 'search');
    return interaction.editReply(
      `Failed to process ${platformName} ${isUrl ? 'URL' : 'search'}: ${e.message}`
    );
  }

  const filePath = path.join(TEMP_MUSIC_DIR, `${videoId}.mp3`);

  let songData;
  try {
    await new Promise((resolve, reject) => {
      session.db.get(
        "SELECT * FROM queue WHERE video_id = ?",
        [videoId],
        async (err, row) => {
          if (err) return reject(err);

          if (row) {
            session.db.run(
              "UPDATE queue SET download_count = download_count + 1 WHERE video_id = ?",
              [videoId]
            );
            songData = {
              videoId: row.video_id,
              url: row.url,
              filePath: row.file_path,
              downloadCount: row.download_count + 1,
            };
            resolve();
          } else {
            try {
              await downloadWithYtDlp({ url: effectiveUrl, outPath: filePath });
              await sleep(300);

              songData = {
                videoId,
                url: effectiveUrl,
                filePath,
                downloadCount: 1,
              };
              session.db.run(
                "INSERT INTO queue (video_id, url, file_path) VALUES (?, ?, ?)",
                [videoId, effectiveUrl, filePath],
                (e2) => (e2 ? reject(e2) : resolve())
              );
            } catch (dErr) {
              reject(dErr);
            }
          }
        }
      );
    });
  } catch (dbErr) {
    error("DB/Download error:", dbErr);
    return interaction.editReply("Failed to process the request.");
  }

  session.queue.push(songData);

  if (!session.isPlaying) {
    await playNext(interaction);
  }

  const pos = session.queue.length;
  return interaction.editReply(`Queued (#${pos}): ${songData.url}`);
}

async function playNext(interaction) {
  const guildId = interaction.guild.id;
  const session = getSession(guildId);

  if (session.queue.length === 0) {
    session.isPlaying = false;
    return;
  }

  const currentSong = session.queue[0];
  const voiceChannel = interaction.member?.voice?.channel;
  if (!voiceChannel) {
    session.queue.shift();
    return;
  }

  // Connect if needed
  if (
    !session.connection ||
    session.connection.state.status === VoiceConnectionStatus.Disconnected
  ) {
    session.connection = joinVoiceChannel({
      channelId: voiceChannel.id,
      guildId: guildId,
      adapterCreator: interaction.guild.voiceAdapterCreator,
    });

    await new Promise((resolve) => {
      session.connection.on(VoiceConnectionStatus.Ready, () => resolve());
    });
  }

  if (!fs.existsSync(currentSong.filePath)) {
    session.queue.shift();
    return playNext(interaction);
  }

  const resource = createAudioResource(currentSong.filePath);
  session.currentPlayer = createAudioPlayer();
  session.currentSongId = currentSong.videoId;

  session.currentPlayer.play(resource);
  session.connection.subscribe(session.currentPlayer);
  log("Playing:", currentSong.filePath);

  session.currentPlayer.on(AudioPlayerStatus.Playing, () => {
    session.isPlaying = true;
  });

  session.currentPlayer.on(AudioPlayerStatus.Idle, async () => {
    const finished = session.queue.shift();
    if (session.currentPlayer) {
      session.currentPlayer.removeAllListeners();
      session.currentPlayer = null;
    }

    setTimeout(async () => {
      const stillQueued = session.queue.some(
        (s) => s.videoId === finished.videoId
      );
      if (!stillQueued && finished.downloadCount === 1) {
        try {
          if (fs.existsSync(finished.filePath)) {
            fs.unlinkSync(finished.filePath);
          }
          await runDb(session, "DELETE FROM queue WHERE video_id = ?", [
            finished.videoId,
          ]);
        } catch (e) {
          // best-effort cleanup
        }
      }
      await playNext(interaction);
    }, 300);
  });

  session.currentPlayer.on("error", async (e) => {
    error("Player error:", e);
    if (session.currentPlayer) {
      session.currentPlayer.removeAllListeners();
      session.currentPlayer = null;
    }
    session.queue.shift();
    setTimeout(() => playNext(interaction), 500);
  });
}

async function pause(interaction) {
  const session = getSession(interaction.guild.id);
  if (
    session.currentPlayer &&
    session.currentPlayer.state.status === "playing"
  ) {
    session.currentPlayer.pause();
    return interaction.reply("Paused.");
  }
  return interaction.reply("Nothing is playing.");
}

async function resume(interaction) {
  const session = getSession(interaction.guild.id);
  if (
    session.currentPlayer &&
    session.currentPlayer.state.status === "paused"
  ) {
    session.currentPlayer.unpause();
    return interaction.reply("Resumed.");
  }
  return interaction.reply("Nothing to resume.");
}

async function skip(interaction) {
  const session = getSession(interaction.guild.id);
  if (session.currentPlayer && session.isPlaying) {
    session.currentPlayer.stop();
    return interaction.reply("Skipped.");
  }
  return interaction.reply("Nothing to skip.");
}

async function stop(interaction, cleanupFn) {
  const session = getSession(interaction.guild.id);
  if (session.connection) {
    if (session.currentPlayer) session.currentPlayer.stop();
    session.connection.destroy();
    session.isPlaying = false;
    await cleanupFn(interaction.guild.id);
    return interaction.reply("Stopped and disconnected.");
  }
  return interaction.reply("Not playing.");
}

function getQueueText(session) {
  if (!session.queue || session.queue.length === 0) return "Queue is empty.";
  let text = "**Queue:**\n";
  session.queue.forEach((song, idx) => {
    const status = idx === 0 ? " (playing) " : "";
    text += `${idx + 1}. ${song.url}${status}\n`;
  });
  if (text.length > 2000) text = text.slice(0, 1900) + "\n... and more";
  return text;
}

module.exports = {
  play,
  playNext,
  pause,
  resume,
  skip,
  stop,
  getQueueText,
};