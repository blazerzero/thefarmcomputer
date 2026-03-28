import type { HTMLElement } from "node-html-parser";
import { parse } from "node-html-parser";
import type { MonsterRow } from "../types";
import { fetchPage, WIKI_BASE } from "./wiki";



// ── Cell parsers ──────────────────────────────────────────────────────────────

/** Parse the drops cell, returning an array of drop strings like "Sap (15%)". */
function parseDrops(cell: HTMLElement): string[] {
  const drops: string[] = [];
  const spans = cell.querySelectorAll("span.nametemplate, span.nametemplateinline") as unknown as HTMLElement[];
  if (spans.length > 0) {
    for (const span of spans) {
      const text = span.text.replace(/\s+/g, " ").trim();
      if (text) drops.push(text);
    }
  } else {
    const text = cell.text.replace(/\s+/g, " ").trim();
    if (text && text !== "—") drops.push(text);
  }
  return drops;
}

/** Normalize text from a location or stat cell. */
function cellText(cell: HTMLElement): string | null {
  const text = cell.text.replace(/\s+/g, " ").trim();
  return text || null;
}

// ── Variations-table parser ────────────────────────────────────────────────────

interface MonsterVariation {
  name: string;
  hp: string | null;
  damage: string | null;
  defense: string | null;
  speed: string | null;
  xp: string | null;
  location: string | null;
  drops: string[];
  image_url: string | null;
}

/**
 * Parse a wikitable with style="text-align:center;" from a monster page.
 *
 * Table structure per variation:
 *   <tr><th colspan="8">VariationName</th></tr>
 *   <tr><td rowspan="3"><img …></td></tr>
 *   <tr><td><b>HP</b></td><td><b>Damage</b></td>…<td><b>Drops</b></td></tr>
 *   <tr><td>hp_val</td>…<td>drops</td></tr>
 *   (optional) <tr><td><b>Notes:</b></td>…</tr>
 */
function parseVariationsTable(table: HTMLElement): MonsterVariation[] {
  const rows = table.querySelectorAll("tr") as unknown as HTMLElement[];
  const variations: MonsterVariation[] = [];

  let currentName: string | null = null;
  let pendingImage: string | null = null;

  for (const row of rows) {
    const th = row.querySelector("th");
    const tds = row.querySelectorAll(":scope > td") as unknown as HTMLElement[];

    // ── Variation name header: <th colspan="8"> or <th colspan="7"> ──────────
    if (th && !tds.length) {
      const colspan = th.getAttribute("colspan") ?? "";
      if (colspan === "8" || colspan === "7") {
        currentName = th.text.replace(/\[\d+\]/g, "").trim();
        pendingImage = null;
      }
      continue;
    }

    // ── Image row: single td with rowspan="3" ────────────────────────────────
    if (tds.length === 1 && tds[0]!.getAttribute("rowspan") === "3") {
      const img = tds[0]!.querySelector("img") as unknown as HTMLElement | null;
      const src = img?.getAttribute("src") ?? null;
      pendingImage = src ? (src.startsWith("http") ? src : WIKI_BASE + src) : null;
      continue;
    }

    // ── Notes row: first td contains <b>Notes:</b> ───────────────────────────
    if (tds.length > 0 && tds[0]!.querySelector("b")) {
      const bText = tds[0]!.querySelector("b")?.text.trim().toLowerCase() ?? "";
      if (bText.includes("note")) continue;
    }

    // ── Header row: 7 tds with <b> tags (HP / Damage / … / Drops) ────────────
    if (tds.length >= 7 && tds.some((td) => td.querySelector("b"))) continue;

    // ── Data row: 7 tds with actual values ───────────────────────────────────
    if (tds.length >= 7 && currentName) {
      const [hp, damage, defense, speed, xp, location, drops] = tds;
      variations.push({
        name: currentName,
        hp: cellText(hp!),
        damage: cellText(damage!),
        defense: cellText(defense!),
        speed: cellText(speed!),
        xp: cellText(xp!),
        location: location ? cellText(location) : null,
        drops: drops ? parseDrops(drops) : [],
        image_url: pendingImage,
      });
    }
  }

  return variations;
}

// ── Infobox parser ────────────────────────────────────────────────────────────

/**
 * Parse the #infoboxtable that appears on individual monster pages when there
 * is no multi-variation wikitable.  Returns null if no infobox is found.
 *
 * Infobox row structure:
 *   <tr><td id="infoboxsection">Label:</td><td id="infoboxdetail">Value</td></tr>
 * (The wiki reuses the same id on multiple rows, so we walk all rows manually.)
 */
function parseInfobox(
  root: HTMLElement,
  fallbackName: string,
): Omit<MonsterRow, "id" | "last_updated" | "wiki_url"> | null {
  const infobox = root.querySelector("#infoboxtable") as unknown as HTMLElement | null;
  if (!infobox) return null;

  // Monster name from the header cell
  const header = infobox.querySelector("#infoboxheader") as unknown as HTMLElement | null;
  const name = header?.text.trim() || fallbackName;

  // Image — first <img> inside the table
  const imgEl = infobox.querySelector("img") as unknown as HTMLElement | null;
  const imgSrc = imgEl?.getAttribute("src") ?? null;
  const image_url = imgSrc ? (imgSrc.startsWith("http") ? imgSrc : WIKI_BASE + imgSrc) : null;

  // Collect label → detail cell pairs by walking every row
  const fields: Record<string, HTMLElement> = {};
  const rows = infobox.querySelectorAll("tr") as unknown as HTMLElement[];
  for (const row of rows) {
    const tds = row.querySelectorAll("td") as unknown as HTMLElement[];
    if (tds.length < 2) continue;
    const labelTd = tds[0]!;
    const valueTd = tds[1]!;
    if (labelTd.getAttribute("id") !== "infoboxsection") continue;
    if (valueTd.getAttribute("id") !== "infoboxdetail") continue;
    const label = labelTd.text.trim().toLowerCase().replace(/:$/, "").trim();
    fields[label] = valueTd;
  }

  // Build location string by combining "spawns in" + "floors"
  const spawnsIn = fields["spawns in"]?.text.trim() ?? null;
  const floors = fields["floors"]?.text.trim() ?? null;
  const location = spawnsIn
    ? floors
      ? `${spawnsIn} (Floors ${floors})`
      : spawnsIn
    : null;

  const hp       = fields["base hp"]?.text.trim()     || null;
  const damage   = fields["base damage"]?.text.trim() || null;
  const defense  = fields["base def"]?.text.trim()    || null;
  const speed    = fields["speed"]?.text.trim()       || null;
  const xp       = fields["xp"]?.text.trim()          || null;
  const drops    = fields["drops"] ? parseDrops(fields["drops"]) : [];

  return { name, location, hp, damage, defense, speed, xp, drops: JSON.stringify(drops), image_url };
}

// ── Page-link collector ────────────────────────────────────────────────────────

/**
 * Fetch /Monsters and return a Map of wiki-path → display-name for every
 * unique monster page linked from nametemplate spans.
 */
async function getMonsterPaths(): Promise<Map<string, string>> {
  const html = await fetchPage("/Monsters");
  const root = parse(html);
  const paths = new Map<string, string>();

  const spans = root.querySelectorAll(
    "span.nametemplate, span.nametemplateinline",
  ) as unknown as HTMLElement[];

  for (const span of spans) {
    const link = span.querySelector("a") as unknown as HTMLElement | null;
    if (!link) continue;

    const href = link.getAttribute("href") ?? "";
    // Keep only root wiki paths; skip anchors and external links
    if (!href.startsWith("/") || href.startsWith("//") || href.includes("#")) continue;

    const name = link.getAttribute("title") ?? link.text.trim();
    if (!paths.has(href)) paths.set(href, name);
  }

  return paths;
}

// ── Main scraper ──────────────────────────────────────────────────────────────

export async function scrapeMonsters(): Promise<Omit<MonsterRow, "id" | "last_updated">[]> {
  const monsterPaths = await getMonsterPaths();
  console.log(`Found ${monsterPaths.size} unique monster page paths`);

  const allMonsters: Omit<MonsterRow, "id" | "last_updated">[] = [];
  const paths = Array.from(monsterPaths.entries());
  const BATCH_SIZE = 5;

  for (let i = 0; i < paths.length; i += BATCH_SIZE) {
    const batch = paths.slice(i, i + BATCH_SIZE);

    const results = await Promise.allSettled(
      batch.map(async ([path, fallbackName]) => {
        const wikiUrl = WIKI_BASE + path;

        let html: string;
        try {
          html = await fetchPage(path);
        } catch (err) {
          console.warn(`Failed to fetch monster page ${path}:`, err);
          return [];
        }

        const root = parse(html);
        const content = root.querySelector("#mw-content-text") ?? root;

        // Find the first wikitable that uses text-align:center (the variations table)
        const tables = content.querySelectorAll("table.wikitable") as unknown as HTMLElement[];
        const pageMonsters: Omit<MonsterRow, "id" | "last_updated">[] = [];

        for (const table of tables) {
          const style = table.getAttribute("style") ?? "";
          if (!style.includes("text-align:center") && !style.includes("text-align: center")) continue;

          const variations = parseVariationsTable(table);
          for (const v of variations) {
            pageMonsters.push({
              name: v.name,
              location: v.location,
              hp: v.hp,
              damage: v.damage,
              defense: v.defense,
              speed: v.speed,
              xp: v.xp,
              drops: JSON.stringify(v.drops),
              image_url: v.image_url,
              wiki_url: wikiUrl,
            });
          }
          break; // only need the first variations table per page
        }

        // Fallback: parse the #infoboxtable that appears on pages without a
        // multi-variation wikitable (e.g. Dust Sprite, Shadow Brute, etc.)
        if (pageMonsters.length === 0) {
          const infoboxData = parseInfobox(root, fallbackName);
          if (infoboxData) {
            pageMonsters.push({ ...infoboxData, wiki_url: wikiUrl });
          }
        }

        return pageMonsters;
      }),
    );

    for (const result of results) {
      if (result.status === "fulfilled") {
        allMonsters.push(...result.value);
      }
    }
  }

  console.log(`Scraped ${allMonsters.length} monsters`);
  return allMonsters;
}
