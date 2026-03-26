import type { HTMLElement } from "node-html-parser";
import { parse } from "node-html-parser";
import type { WeaponRow } from "../types";
import { fetchPage } from "./wiki";

const WIKI_BASE = "https://stardewvalleywiki.com";

// Map plural heading text → singular category name
const CATEGORY_MAP: Record<string, string> = {
  swords: "Sword",
  daggers: "Dagger",
  clubs: "Club",
  hammers: "Hammer",
  spears: "Spear",
  staves: "Staff",
  scythes: "Scythe",
};

function headingToCategory(text: string): string | null {
  const key = text.toLowerCase().trim();
  return CATEGORY_MAP[key] ?? null;
}

/** Parse a damage cell that may contain a range like "5-10" or "5 – 10". */
function parseDamage(text: string): [number | null, number | null] {
  const range = text.match(/(\d+)\s*[–\-]\s*(\d+)/);
  if (range) return [parseInt(range[1]!, 10), parseInt(range[2]!, 10)];
  const single = text.match(/^(\d+)$/);
  if (single) {
    const n = parseInt(single[1]!, 10);
    return [n, n];
  }
  return [null, null];
}

/** Parse crit chance from text like "+.02" or "0.02" → 2.0 (0–100 scale). */
function parseCritChance(text: string): number | null {
  const m = text.match(/([\d.]+)/);
  if (!m) return null;
  const val = parseFloat(m[1]!);
  if (isNaN(val)) return null;
  // Values like 0.02 need to be converted to 2.0; values already >1 are left as-is
  return val <= 1 ? Math.round(val * 10000) / 100 : val;
}

/** Parse a plain integer from a cell; returns null if absent or non-numeric. */
function parseInt2(text: string): number | null {
  const m = text.match(/(-?\d+)/);
  if (!m) return null;
  const n = parseInt(m[1]!, 10);
  return isNaN(n) ? null : n;
}

/** Parse a float from a cell (for crit multiplier like "3" or "3.0"). */
function parseFloat2(text: string): number | null {
  const m = text.match(/([\d.]+)/);
  if (!m) return null;
  const n = parseFloat(m[1]!);
  return isNaN(n) ? null : n;
}

// ── Main scraper ───────────────────────────────────────────────────────────────

export async function scrapeWeapons(): Promise<Omit<WeaponRow, "id" | "last_updated">[]> {
  const html = await fetchPage("/Weapons");
  const root = parse(html);
  const content = root.querySelector("#mw-content-text") ?? root;

  const weapons: Omit<WeaponRow, "id" | "last_updated">[] = [];
  let currentCategory = "Sword";

  const elements = content.querySelectorAll("h2, h3, table.wikitable") as unknown as HTMLElement[];

  for (const el of elements) {
    const tag = el.tagName;

    // ── Section heading — update current category ──────────────────────────
    if (tag === "H2" || tag === "H3") {
      const text = (el.querySelector(".mw-headline") ?? el).text.trim();
      const cat = headingToCategory(text);
      if (cat) currentCategory = cat;
      continue;
    }

    // ── Weapon data table ──────────────────────────────────────────────────
    const allRows = el.querySelectorAll(":scope > tbody > tr") as unknown as HTMLElement[];
    if (allRows.length < 2) continue;

    // Parse header row to build column index map
    const headerRow = allRows[0]!;
    const headerCells = headerRow.querySelectorAll(":scope > th") as unknown as HTMLElement[];
    if (headerCells.length < 2) continue;

    const colIdx: Record<string, number> = {};
    let colI = 0;
    for (const th of headerCells) {
      const text = th.text.toLowerCase().trim();
      const colspan = parseInt(th.getAttribute("colspan") ?? "1", 10);

      if (text === "image" || text === "img") colIdx.image = colI;
      else if (text === "name") colIdx.name = colI;
      else if (text.includes("min") && text.includes("damage")) colIdx.min_damage = colI;
      else if (text.includes("max") && text.includes("damage")) colIdx.max_damage = colI;
      else if (text.includes("damage") && !text.includes("min") && !text.includes("max")) colIdx.damage = colI;
      else if (text === "speed") colIdx.speed = colI;
      else if (text === "defense" || text === "def") colIdx.defense = colI;
      else if (text.includes("crit") && text.includes("chance")) colIdx.crit_chance = colI;
      else if (text.includes("crit") && text.includes("multi")) colIdx.crit_multiplier = colI;
      else if (text === "mining") colIdx.mining = colI;
      else if (text === "level" || text === "lvl") colIdx.level = colI;
      else if (text === "description" || text === "desc" || text === "source" || text === "notes") colIdx.description = colI;

      colI += colspan;
    }

    // Must have at least a name column to be worth parsing
    if (colIdx.name === undefined) continue;

    const seenNameCells = new Set<HTMLElement>();

    for (let i = 1; i < allRows.length; i++) {
      const row = allRows[i]!;
      const cells = row.querySelectorAll(":scope > td") as unknown as HTMLElement[];

      const get = (key: string): HTMLElement | null => {
        const idx = colIdx[key];
        return idx !== undefined ? (cells[idx] ?? null) : null;
      };

      const nameCell = get("name");
      if (!nameCell) continue;

      // Skip rows without a weapon name link
      const nameLink = nameCell.querySelector("a");
      if (!nameLink) continue;

      // Deduplicate rowspan'd name cells
      if (seenNameCells.has(nameCell)) continue;
      seenNameCells.add(nameCell);

      const weaponName = nameLink.text.trim();
      if (!weaponName || weaponName.toLowerCase() === "name") continue;

      const href = nameLink.getAttribute("href") ?? "";
      const wikiUrl = href.startsWith("http") ? href : WIKI_BASE + href;

      // Image
      let imageUrl: string | null = null;
      const imageCell = get("image");
      if (imageCell) {
        const img = imageCell.querySelector("img");
        const src = img?.getAttribute("src") ?? "";
        if (src) imageUrl = src.startsWith("http") ? src : WIKI_BASE + src;
      }

      // Damage — handle separate min/max columns or a single range column
      let minDamage: number | null = null;
      let maxDamage: number | null = null;
      if (colIdx.min_damage !== undefined && colIdx.max_damage !== undefined) {
        minDamage = parseInt2(get("min_damage")?.text ?? "");
        maxDamage = parseInt2(get("max_damage")?.text ?? "");
      } else if (colIdx.damage !== undefined) {
        [minDamage, maxDamage] = parseDamage(get("damage")?.text.trim() ?? "");
      }

      // Stats
      const speed       = parseInt2(get("speed")?.text.trim() ?? "");
      const defense     = parseInt2(get("defense")?.text.trim() ?? "");
      const mining      = parseInt2(get("mining")?.text.trim() ?? "");
      const level       = parseInt2(get("level")?.text.trim() ?? "");
      const critChance  = parseCritChance(get("crit_chance")?.text.trim() ?? "");
      const critMulti   = parseFloat2(get("crit_multiplier")?.text.trim() ?? "");

      // Description / source
      const descText = get("description")?.text.replace(/\s+/g, " ").trim() || null;

      weapons.push({
        name: weaponName,
        category: currentCategory,
        min_damage: minDamage,
        max_damage: maxDamage,
        speed,
        defense,
        crit_chance: critChance,
        crit_multiplier: critMulti,
        mining,
        level,
        description: descText,
        image_url: imageUrl,
        wiki_url: wikiUrl,
      });
    }
  }

  console.log(`Scraped ${weapons.length} weapons`);
  return weapons;
}
