const { spawn, exec } = require("child_process");
const fs = require("fs");
const fsp = require("fs/promises");
const path = require("path");

async function downloadWithYtDlp({ url, outPath }) {
  if (fs.existsSync(outPath)) return outPath;

  const cleanedUrl = url.split("&ab_channel")[0];
  const command = `yt-dlp -x --audio-format mp3 -o "${outPath}" "${cleanedUrl}"`;

  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) return reject(error);
      resolve(outPath);
    });
  });
}

async function downloadWithSpotDL({
  url,
  outPath,
  format = "mp3",
  bitrate = "320k",
  spotdlBin = "spotdl",
}) {
  if (!url) throw new Error("url is required");
  if (!outPath) throw new Error("outPath is required");

  if (fs.existsSync(outPath)) return outPath;

  const dir = path.dirname(outPath);
  await fsp.mkdir(dir, { recursive: true });

  const args = [
    url,
    "--format",
    format,
    "--bitrate",
    bitrate,
    "--output",
    outPath,
    "--restrict-filenames",
    "--search-query",
    "ytmsearch",
  ];

  await new Promise((resolve, reject) => {
    const child = spawn(spotdlBin, args, { stdio: ["ignore", "pipe", "pipe"] });

    child.stdout.on("data", (d) => process.stdout.write(d));
    child.stderr.on("data", (d) => process.stderr.write(d));

    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`spotdl exited with code ${code}`));
    });
  });

  const exists = fs.existsSync(outPath);
  if (!exists) {
    throw new Error("spotdl finished without creating the expected file.");
  }

  return outPath;
}

module.exports = { downloadWithYtDlp, downloadWithSpotDL };
