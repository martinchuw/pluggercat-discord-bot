const { exec } = require("child_process");

function execJson(cmd) {
  return new Promise((resolve, reject) => {
    exec(cmd, { maxBuffer: 1024 * 1024 * 16 }, (err, stdout) => {
      if (err) return reject(err);
      try {
        resolve(JSON.parse(stdout));
      } catch (e) {
        reject(e);
      }
    });
  });
}

async function ytSearchFirst(query) {
  const candidates = [
    `ytsearch1:${query}`,
    `ytsearch1:${query} official audio`,
    `ytsearch1:${query} lyrics`,
    `ytsearch1:${query} topic`,
  ];
  for (const c of candidates) {
    try {
      const data = await execJson(`yt-dlp -J "${c.replace(/"/g, '\\"')}"`);
      const entry = (data.entries && data.entries[0]) || data;
      if (entry?.id && entry?.webpage_url) {
        return {
          id: entry.id,
          url: entry.webpage_url,
          title: entry.title,
          uploader: entry.uploader,
          duration: entry.duration,
        };
      }
    } catch {}
  }
  throw new Error("No se encontró resultado en YouTube");
}

module.exports = { ytSearchFirst };
