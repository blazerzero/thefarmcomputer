const BASE_URL = "https://stardewvalleywiki.com";
const USER_AGENT =
  "StardewBot/1.0 (Discord lookup bot; github.com/blazerzero/thefarmcomputer)";

/**
 * Fetch a wiki page with up to 3 retries and exponential backoff.
 * @param path  Wiki path, e.g. "/Crops" or "/Abigail"
 * @returns     HTML string
 */
export async function fetchPage(path: string): Promise<string> {
  const url = BASE_URL + path;
  const delays = [2000, 4000, 8000];

  let lastError: unknown;
  for (let attempt = 0; attempt <= delays.length; attempt++) {
    try {
      const resp = await fetch(url, {
        headers: { "User-Agent": USER_AGENT },
        signal: AbortSignal.timeout(15_000),
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status} for ${url}`);
      return await resp.text();
    } catch (err) {
      lastError = err;
      const delay = delays[attempt];
      if (delay !== undefined) {
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }

  throw new Error(`Failed to fetch ${url} after retries: ${lastError}`);
}
