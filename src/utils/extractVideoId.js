module.exports = function extractVideoId(url) {
  const cleanedUrl = url.split('&ab_channel')[0];
  const videoIdMatch = cleanedUrl.match(/(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|\S*\?v=|.*[\/\\])|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (!videoIdMatch) {
    throw new Error("Invalid URL or unable to parse video ID.");
  }
  return videoIdMatch[1];
};
