const { exec } = require("child_process");
const fs = require("fs");


async function downloadWithYtDlp({ url, outPath }) {
  if (fs.existsSync(outPath)) return outPath;

  const cleanedUrl = url.split("&ab_channel")[0];
  const command = [
    "yt-dlp",
    "--no-playlist",
    "-x", "--audio-format", "mp3",
    "--audio-quality", "0",
    "--no-progress",
    "--restrict-filenames",
    "-o", `"${outPath}"`,
    `"${cleanedUrl}"`
  ].join(" ");

  return new Promise((resolve, reject) => {
    exec(command, { maxBuffer: 1024 * 1024 * 32 }, (error) => {
      if (error) return reject(error);
      resolve(outPath);
    });
  });
}

module.exports = { downloadWithYtDlp };
