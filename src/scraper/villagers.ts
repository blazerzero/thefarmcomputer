import { parse } from "node-html-parser";
import { fetchPage } from "./wiki";
import type { VillagerRow } from "../types";

const WIKI_BASE = "https://stardewvalleywiki.com";
const GIFT_TIERS = ["loved", "liked", "neutral", "disliked", "hated"] as const;
type GiftTier = (typeof GIFT_TIERS)[number];

// Non-social NPCs whose pages don't have a standard gift table
const NON_SOCIAL = new Set([
  "Dwarf", "Krobus", "Sandy", "Marnie", "Pam", "Linus", "Willy", "Leo",
]);

const BATCH_SIZE = 5; // concurrent fetch limit

/** Fetch the /Villagers page and return (name, path) pairs. */
async function scrapeVillagerList(): Promise<Array<[string, string]>> {
  const html = await fetchPage("/Villagers");
  const root = parse(html);

  const seen = new Set<string>();
  const result: Array<[string, string]> = [];

  for (const table of root.querySelectorAll("table.wikitable")) {
    for (const row of table.querySelectorAll("tr")) {
      const link = row.querySelector("td a, th a");
      if (!link) continue;
      const name = link.text.trim();
      const href = link.getAttribute("href") ?? "";
      if (name && href.startsWith("/") && !NON_SOCIAL.has(name) && !seen.has(name)) {
        seen.add(name);
        result.push([name, href]);
      }
    }
  }

  console.log(`Found ${result.length} villagers`);
  return result;
}

/** Parse gift preferences from one villager's HTML page. */
function parseGifts(html: string): Record<GiftTier, string[]> {
  const root = parse(html);
  const gifts: Record<GiftTier, string[]> = {
    loved: [], liked: [], neutral: [], disliked: [], hated: [],
  };

  // Strategy 1: find a "Gifts" heading, then grab the first table after it
  const headings = root.querySelectorAll("h2, h3, h4");
  let giftsTable = null;
  for (const heading of headings) {
    if (heading.text.toLowerCase().includes("gift")) {
      let sibling = heading.nextElementSibling;
      while (sibling) {
        if (sibling.tagName?.match(/^h[2-4]$/i)) break;
        if (sibling.tagName === "TABLE") { giftsTable = sibling; break; }
        sibling = sibling.nextElementSibling;
      }
      break;
    }
  }

  // Strategy 2: any table whose first-column cells contain tier names
  const candidates = giftsTable ? [giftsTable] : root.querySelectorAll("table");
  for (const table of candidates) {
    let matched = false;
    for (const row of table.querySelectorAll("tr")) {
      const cells = row.querySelectorAll("td, th");
      if (cells.length < 2) continue;
      const tierText = cells[0]!.text.toLowerCase().trim();
      const tier = GIFT_TIERS.find((t) => tierText.includes(t));
      if (!tier) continue;

      // Collect item names from links, or plain text
      const items: string[] = [];
      for (const cell of cells.slice(1)) {
        const links = cell.querySelectorAll("a");
        if (links.length) {
          items.push(...links.map((a) => a.text.trim()).filter(Boolean));
        } else {
          const raw = cell.text.trim();
          if (raw) items.push(...raw.split(",").map((s) => s.trim()).filter(Boolean));
        }
      }
      if (items.length) { gifts[tier] = items; matched = true; }
    }
    if (matched) break;
  }

  return gifts;
}

/** Parse birthday from one villager's HTML page. */
function parseBirthday(html: string): string {
  const root = parse(html);
  for (const row of root.querySelectorAll("tr")) {
    const th = row.querySelector("th");
    if (th && th.text.toLowerCase().includes("birthday")) {
      const td = row.querySelector("td");
      if (td) return td.text.replace(/\s+/g, " ").trim();
    }
  }
  return "";
}

/** Scrape gift + birthday data for all social villagers. */
export async function scrapeVillagers(): Promise<Omit<VillagerRow, "id" | "last_updated">[]> {
  const list = await scrapeVillagerList();
  const results: Omit<VillagerRow, "id" | "last_updated">[] = [];

  // Process in batches to avoid hitting rate limits / time limits
  for (let i = 0; i < list.length; i += BATCH_SIZE) {
    const batch = list.slice(i, i + BATCH_SIZE);
    const settled = await Promise.allSettled(
      batch.map(async ([name, path]) => {
        const html = await fetchPage(path);
        const birthday = parseBirthday(html);
        const gifts = parseGifts(html);
        return {
          name,
          birthday,
          loved_gifts:    JSON.stringify(gifts.loved),
          liked_gifts:    JSON.stringify(gifts.liked),
          neutral_gifts:  JSON.stringify(gifts.neutral),
          disliked_gifts: JSON.stringify(gifts.disliked),
          hated_gifts:    JSON.stringify(gifts.hated),
          wiki_url:       WIKI_BASE + path,
        } satisfies Omit<VillagerRow, "id" | "last_updated">;
      }),
    );

    for (const outcome of settled) {
      if (outcome.status === "fulfilled") {
        results.push(outcome.value);
      } else {
        console.error("Failed to scrape villager:", outcome.reason);
      }
    }
  }

  console.log(`Scraped ${results.length} villagers`);
  return results;
}
