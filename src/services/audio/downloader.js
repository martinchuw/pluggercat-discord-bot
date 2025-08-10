const { exec } = require("child_process");
const fs = require("fs");

async function downloadWithYtDlp({ url, outPath }) {
  if (fs.existsSync(outPath)) return outPath;

  const cleanedUrl = url.split('&ab_channel')[0];
  const command = `yt-dlp -x --audio-format mp3 -o "${outPath}" "${cleanedUrl}"`;

  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) return reject(error);
      resolve(outPath);
    });
  });
}

module.exports = { downloadWithYtDlp };
