module.exports = function isSoundcloudUrl(url = "") {
  try {
    const u = new URL(url);
    return (
      u.hostname.includes("soundcloud.com") ||
      u.hostname.includes("on.soundcloud.com")
    );
  } catch {
    return false;
  }
};
