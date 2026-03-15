import { parse } from "node-html-parser";
import {rehype} from "rehype";
import rehypeParse from "rehype-parse";
import rehypeRemark from "rehype-remark";
import remarkStringify from "remark-stringify";
import strip from "strip-markdown";
import type { VillagerRow } from "../types";
import { fetchPage } from "./wiki";

const WIKI_BASE = "https://stardewvalleywiki.com";
const GIFT_TIERS = ["loved", "liked", "neutral", "disliked", "hated"] as const;
type GiftTier = (typeof GIFT_TIERS)[number];

const GIFT_HEADING_TO_TIER: Record<string, GiftTier> = {
  "Love": "loved",
  "Like": "liked",
  "Neutral": "neutral",
  "Dislike": "disliked",
  "Hate": "hated",
};

const BATCH_SIZE = 5; // concurrent fetch limit

/** Fetch the /Villagers page and return (name, path) pairs. */
async function scrapeVillagerList(): Promise<Array<[string, string]>> {
  const html = await fetchPage("/Villagers");
  const root = parse(html);
  const seen = new Set<string>();
  const result: Array<[string, string]> = [];

  const sections = root.querySelectorAll("h2, h3");
  for (const sec of sections) {
    if (sec.text === "Non-giftable NPCs") continue; // skip non-social section

    const villagersInSection = sec.querySelectorAll(":scope + ul li div.gallerytext a");
    for (const link of villagersInSection) {
      const name = link.text.trim();
      const href = link.getAttribute("href") ?? `${name}`;
      if (!seen.has(name)) {
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

  const headings = root.querySelectorAll("h3");
  for (const heading of headings) {
    const headingText = heading.text.trim();
    if (!["Love", "Like", "Neutral", "Dislike", "Hate"].includes(headingText)) continue; // skip non-gift tables{
    const tier = GIFT_HEADING_TO_TIER[headingText] as GiftTier;
    const giftTable = heading.querySelector(":scope ~ table.wikitable")!

    for (const row of giftTable.querySelectorAll("tr")) {
      const cells = row.querySelectorAll("td");
      if (cells.length < 1) continue;

      const contentAsList = cells[1]?.querySelector(":scope > ul");
      if (contentAsList) {
        const md = rehype()
          .use(rehypeParse, { fragment: true })
          .use(rehypeRemark)
          .use(remarkStringify)
          .use(strip, {keep: ["list", "listItem"]})
          .processSync(contentAsList.innerHTML)
        const text = String(md)
          .replaceAll(/^\*\s/gm, "")
          .replaceAll("\\\*", "")
          .replaceAll(" (except:-", " (except:\n  -")
          .trim();
        const items = text.split("\n\n").map(s => s.trim()).filter(s => s);
        gifts[tier].push(...items);
      } else {
        const item = cells[1]?.text.trim();
        if (item) gifts[tier].push(item);
      }
    }
  }

  return gifts;
}

/** Parse birthday from one villager's HTML page. */
function parseVillagerDetails(name: string, html: string): {
  birthday: string;
  image_url: string;
} {
  const root = parse(html);
  let birthday = "", image_url = "";
  for (const row of root.querySelectorAll("table#infoboxtable tr")) {
    const details = row.querySelectorAll("td");
    for (const detail of details) {
      if (detail.text.trim().toLowerCase() === "birthday") {
        const birthdayField = detail.querySelector(":scope + td");
        if (birthdayField) birthday = birthdayField.text.replace(/\s+/g, " ").trim();
      } else {
        const img = detail.querySelector(`:scope img[alt="${name}.png"]`)
        if (img) image_url = WIKI_BASE + img.getAttribute("src");
      }
    }
  }
  return { birthday, image_url };
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
        const {birthday, image_url} = parseVillagerDetails(name, html);
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
          image_url,
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
