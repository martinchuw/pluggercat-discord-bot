module.exports = function isSpotifyUrl(url) {
  try {
    const u = new URL(url);
    return (
      u.hostname.includes("open.spotify.com") &&
      u.pathname.startsWith("/track/")
    );
  } catch {
    return false;
  }
};
