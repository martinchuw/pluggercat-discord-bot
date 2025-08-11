const puppeteer = require("puppeteer");

function extractTrackId(spotifyUrl) {
  try {
    const u = new URL(spotifyUrl);
    if (
      u.hostname.includes("open.spotify.com") &&
      u.pathname.startsWith("/track/")
    ) {
      return u.pathname.split("/track/")[1].split("/")[0];
    }
  } catch {}
  return null;
}

function parseArtistFromDescription(desc) {
  if (!desc) return null;
  const bullets = desc.split("·").map((s) => s.trim());
  if (bullets.length >= 2) return bullets[1];

  const by = desc.toLowerCase().split(" by ");
  if (by.length >= 2) return by.slice(1).join(" by ").trim();

  const dash = desc.split(" - ").map((s) => s.trim());
  if (dash.length >= 2) return dash[1];

  return null;
}

async function getSpotifyMetaWithPuppeteer(spotifyUrl, opts = {}) {
  const {
    headless = "new",
    timeoutMs = 20000,
    retries = 1,
    waitUntil = "domcontentloaded",
    blockMedia = true,
    executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
  } = opts;

  let browser;
  let lastErr;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      browser = await puppeteer.launch({
        headless,
        executablePath,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-gpu",
        ],
      });

      const page = await browser.newPage();
      await page.setUserAgent(
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome Safari"
      );
      await page.setExtraHTTPHeaders({ "Accept-Language": "en" });
      await page.setDefaultNavigationTimeout(timeoutMs);

      if (blockMedia) {
        await page.setRequestInterception(true);
        page.on("request", (req) => {
          const type = req.resourceType();
          if (["image", "font", "media"].includes(type)) return req.abort();
          return req.continue();
        });
      }

      await page.goto(spotifyUrl, { waitUntil });

      // OG tags
      const og = await page.evaluate(() => {
        const get = (sel) =>
          document.querySelector(sel)?.getAttribute("content") || null;
        return {
          title: get('meta[property="og:title"]'),
          description: get('meta[property="og:description"]'),
          image: get('meta[property="og:image"]'),
        };
      });

      let title = og.title || null;
      let artist = parseArtistFromDescription(og.description || "") || null;
      let thumbnail = og.image || null;

      // SON-LD fallback
      if (!title) {
        const ld = await page.evaluate(() => {
          const out = [];
          document
            .querySelectorAll('script[type="application/ld+json"]')
            .forEach((s) => {
              try {
                out.push(JSON.parse(s.textContent));
              } catch {}
            });
          return out;
        });

        const arr = ld.flatMap((d) => (Array.isArray(d) ? d : [d]));
        for (const obj of arr) {
          if (
            obj &&
            (obj["@type"] === "MusicRecording" || obj["@type"] === "MusicAlbum")
          ) {
            title = title || obj.name || null;
            const byArtist = obj.byArtist || obj.artist || null;
            if (!artist && byArtist) {
              if (Array.isArray(byArtist))
                artist = byArtist
                  .map((a) => a.name)
                  .filter(Boolean)
                  .join(", ");
              else if (byArtist?.name) artist = byArtist.name;
            }
            if (!thumbnail) {
              thumbnail = Array.isArray(obj.image)
                ? obj.image[0]
                : obj.image || null;
            }
            if (title) break;
          }
        }
      }

      if (!title) {
        const pageTitle = await page.title();
        title = pageTitle?.replace(/\s*[-|–]\s*Spotify.*$/i, "").trim() || null;
      }

      if (!title) title = extractTrackId(spotifyUrl) || null;

      await browser.close();
      return { title, artist, thumbnail };
    } catch (err) {
      lastErr = err;
      if (browser) {
        try {
          await browser.close();
        } catch {}
      }
      await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
    }
  }

  throw lastErr || new Error("Puppeteer scraping failed");
}

module.exports = {
  getSpotifyMetaWithPuppeteer,
  extractTrackId,
  parseArtistFromDescription,
};
