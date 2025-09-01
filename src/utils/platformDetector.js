function isSoundcloudUrl(url = "") {
  try {
    const u = new URL(url);
    return (
      u.hostname.includes("soundcloud.com") ||
      u.hostname.includes("on.soundcloud.com")
    );
  } catch {
    return false;
  }
}

function isSpotifyUrl(url) {
  try {
    const u = new URL(url);
    return (
      u.hostname.includes("open.spotify.com") &&
      u.pathname.startsWith("/track/")
    );
  } catch {
    return false;
  }
}

function isYouTubeUrl(url) {
  try {
    const u = new URL(url);
    return (
      u.hostname.includes("youtube.com") || u.hostname.includes("youtu.be")
    );
  } catch {
    return false;
  }
}

function isYouTubeMusicUrl(url) {
  try {
    const u = new URL(url);
    return u.hostname.includes("music.youtube.com");
  } catch {
    return false;
  }
}

function detectPlatform(url) {
  if (isYouTubeMusicUrl(url)) {
    return "youtube_music";
  }
  if (isYouTubeUrl(url)) {
    return "youtube";
  }
  if (isSpotifyUrl(url)) {
    return "spotify";
  }
  if (isSoundcloudUrl(url)) {
    return "soundcloud";
  }
  return "unknown";
}

module.exports = {
  isSoundcloudUrl,
  isSpotifyUrl,
  isYouTubeUrl,
  isYouTubeMusicUrl,
  detectPlatform,
};
