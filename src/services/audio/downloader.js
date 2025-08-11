const { exec } = require("child_process");
const fs = require("fs");

async function downloadWithYtDlp({ url, outPath }) {
  if (fs.existsSync(outPath)) return outPath;

  const command = [
    "yt-dlp",
    "--no-playlist",
    "-x", "--audio-format", "mp3",
    "--audio-quality", "0",
    "--embed-metadata",
    "--embed-thumbnail",
    "--convert-thumbnails", "jpg",
    "--no-progress",
    "--restrict-filenames",
    "-o", `"${outPath}"`,
    `"${url}"`
  ].join(" ");

  return new Promise((resolve, reject) => {
    exec(command, { maxBuffer: 1024 * 1024 * 64 }, (error) => {
      if (error) return reject(error);
      resolve(outPath);
    });
  });
}

module.exports = { downloadWithYtDlp };
