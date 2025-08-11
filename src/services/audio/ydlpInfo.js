const { exec } = require("child_process");

function execJson(cmd) {
  return new Promise((resolve, reject) => {
    exec(cmd, { maxBuffer: 1024 * 1024 * 64 }, (err, stdout, stderr) => {
      if (err) return reject(err);
      try {
        const json = JSON.parse(stdout);
        resolve(json);
      } catch (e) {
        reject(new Error(`Invalid JSON from yt-dlp: ${e.message}\n${stderr}`));
      }
    });
  });
}

async function getYtDlpInfo(url) {
  const cmd = `yt-dlp -J --no-playlist "${url}"`;
  const data = await execJson(cmd);

  if (Array.isArray(data?.entries) && data.entries.length > 0) {
    return data.entries[0];
  }

  return data;
}

module.exports = { getYtDlpInfo };
