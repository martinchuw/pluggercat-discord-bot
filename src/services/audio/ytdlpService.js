const { exec } = require("child_process");

function execJson(cmd, maxBuffer = 1024 * 1024 * 64) {
  return new Promise((resolve, reject) => {
    exec(cmd, { maxBuffer }, (err, stdout, stderr) => {
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

async function ytSearchFirst(query) {
  const candidates = [
    `ytsearch1:${query}`,
    `ytsearch1:${query} official audio`,
    `ytsearch1:${query} lyrics`,
    `ytsearch1:${query} topic`,
  ];

  for (const candidate of candidates) {
    try {
      const escapedQuery = candidate.replace(/"/g, '\\"');
      const data = await execJson(
        `yt-dlp -J "${escapedQuery}"`,
        1024 * 1024 * 16
      );
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
    } catch (error) {
      continue;
    }
  }

  throw new Error("No results found on YouTube");
}

async function ytSearch(query, limit = 5) {
  try {
    const escapedQuery = query.replace(/"/g, '\\"');
    const data = await execJson(`yt-dlp -J "ytsearch${limit}:${escapedQuery}"`);

    if (data.entries && Array.isArray(data.entries)) {
      return data.entries.map((entry) => ({
        id: entry.id,
        url: entry.webpage_url,
        title: entry.title,
        uploader: entry.uploader,
        duration: entry.duration,
        description: entry.description,
        thumbnail: entry.thumbnail,
      }));
    }

    return [];
  } catch (error) {
    throw new Error(`YouTube search failed: ${error.message}`);
  }
}

async function getAvailableFormats(url) {
  try {
    const data = await getYtDlpInfo(url);
    return data.formats || [];
  } catch (error) {
    throw new Error(`Failed to get formats: ${error.message}`);
  }
}

module.exports = {
  execJson,
  getYtDlpInfo,
  ytSearchFirst,
  ytSearch,
  getAvailableFormats,
};
