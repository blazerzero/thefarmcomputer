import { parse } from "node-html-parser";
import type { BundleItem, BundleRow } from "../types";
import { fetchPage } from "./wiki";

const WIKI_BASE = "https://stardewvalleywiki.com";

function parseQuantity(text: string, itemName: string): number {
  // Look for "(N)" after the item name in the cell text, e.g. "Wood (99)"
  const escaped = itemName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const afterName = text.replace(escaped, "");
  const m = afterName.match(/\((\d[\d,]*)\)/);
  return m ? parseInt(m[1]!.replace(/,/g, ""), 10) : 1;
}

function parseRewardQty(text: string, itemName: string): string {
  const escaped = itemName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const afterName = text.replace(escaped, "");
  const m = afterName.match(/\((\d[\d,]*)\)/);
  return m ? m[1]! : "1";
}

function parseGoldCost(text: string): number | null {
  const m = text.match(/(\d[\d,]*)\s*g\b/i);
  return m ? parseInt(m[1]!.replace(/,/g, ""), 10) : null;
}

function detectQuality(cellText: string, imgAlts: string[]): BundleItem["quality"] {
  // Check for gold/silver quality indicators in image alt text or cell text
  const combined = [cellText, ...imgAlts].join(" ").toLowerCase();
  if (combined.includes("iridium quality") || combined.includes("quality_4") || combined.includes("iridium star")) return "Gold"; // treat iridium as gold for display
  if (combined.includes("gold quality") || combined.includes("quality_3") || combined.includes("gold star")) return "Gold";
  if (combined.includes("silver quality") || combined.includes("quality_2") || combined.includes("silver star")) return "Silver";
  return undefined;
}

export async function scrapeBundles(): Promise<Omit<BundleRow, "id" | "last_updated">[]> {
  const html = await fetchPage("/Bundles");
  const root = parse(html);

  const content = root.querySelector("#mw-content-text") ?? root;
  const bundles: Omit<BundleRow, "id" | "last_updated">[] = [];

  let currentRoom = "";

  // Walk room headings and wikitables in document order
  const elements = content.querySelectorAll("h3, table.wikitable");

  for (const el of elements) {
    // ── Room heading ────────────────────────────────────────────────────────
    if (el.tagName === "H3") {
      const text = el.querySelector(".mw-headline")?.text.trim() ?? el.text.trim();
      currentRoom = text;
    }

    if (!currentRoom) continue;
    const rows = el.querySelectorAll(":scope > tbody > tr");
    if (rows.length < 2) continue;

    // ── Bundle header row ───────────────────────────────────────────────────
    // First row must have a <th> spanning the table — this is the bundle name
    const headerRow = rows[0]!;
    const headerThs = headerRow.querySelectorAll(":scope > th");
    if (headerThs.length === 0) continue;

    // Bundle name may be a link (e.g. <a href="/Spring_Foraging_Bundle">) or plain text
    const headerTh = headerThs[0]!;
    const nameLink = headerTh.querySelectorAll("a")
      .find((a) => !a.getAttribute("href")?.startsWith("/File:"));
    const bundleName = (nameLink?.text ?? headerTh.text).replace(/\s+/g, " ").trim();
    if (!bundleName) continue;

    // ── Parse remaining rows ────────────────────────────────────────────────
    const items: BundleItem[] = [];
    let reward = "";
    let bundleImageUrl: string | null = null;
    let items_required: number | null = null;

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i]!;
      const rowText = row.text.replace(/\s+/g, " ").trim();

      // Check for "N of M" choice-bundle indicator in any non-item row
      // e.g. "Any 5 of the following" / "Choose 5" / "Complete 5 of 9 items"
      if (items_required === null && items.length === 0) {
        const choiceMatch =
          rowText.match(/any\s+(\d+)\s+of/i) ??
          rowText.match(/choose\s+(\d+)/i) ??
          rowText.match(/complete\s+(\d+)\s+of/i) ??
          rowText.match(/\((\d+)\s+of\s+\d+\)/i);
        if (choiceMatch) {
          items_required = parseInt(choiceMatch[1]!, 10);
          continue; // this row is just a note — no item data
        }
      }

      const tds = row.querySelectorAll(":scope > td");

      // ── Reward row ─────────────────────────────────────────────────────────
      // Detected by the presence of "Reward" text in the row
      if (rowText.toLowerCase().includes("reward")) {
        for (const td of tds) {
          // Find the reward item link (non-File)
          const rewardLink = td.querySelectorAll("a")
            .find((a) => !a.getAttribute("href")?.startsWith("/File:"));
          if (rewardLink) {
            const rewardName = rewardLink.text.trim();
            const qty = parseRewardQty(td.text.replace(/\s+/g, " ").trim(), rewardName);
            reward = qty === "1" ? rewardName : `${rewardName} (${qty})`;
            break;
          }
        }
        continue;
      }

      // ── Vault: gold purchase row ────────────────────────────────────────────
      if (currentRoom === "Vault") {
        for (const td of tds) {
          if (td.getAttribute("rowspan")) continue; // skip bundle image cell
          const tdText = td.text.replace(/\s+/g, " ").trim();
          const goldCost = parseGoldCost(tdText);
          if (goldCost !== null && goldCost > 0 && items.length === 0) {
            items.push({ name: "Gold", quantity: goldCost });
          }
        }
        continue;
      }

      // ── Item row ────────────────────────────────────────────────────────────
      for (const td of tds) {
        // A td with a rowspan is the bundle image column — grab the image URL
        const rowspan = td.getAttribute("rowspan");
        if (rowspan && parseInt(rowspan, 10) > 1) {
          if (!bundleImageUrl) {
            const imgSrc = td.querySelector("img")?.getAttribute("src") ?? null;
            bundleImageUrl = imgSrc
              ? imgSrc.startsWith("http") ? imgSrc : WIKI_BASE + imgSrc
              : null;
          }
          continue; // skip the bundle image cell itself
        }

        // Look for a non-File item page link in this cell
        const itemLink = td.querySelectorAll("a")
          .find((a) => {
            const href = a.getAttribute("href");
            return href && !href.startsWith("/File:") && !href.startsWith("/index.php");
          });

        if (itemLink) {
          const name = itemLink.text.replace(/\s+/g, " ").trim();
          if (!name) continue;

          const cellText = td.text.replace(/\s+/g, " ").trim();
          const quantity = parseQuantity(cellText, name);

          // Detect quality from images in the same td or row
          const imgAlts = row.querySelectorAll("img")
            .map((img) => img.getAttribute("alt") ?? img.getAttribute("src") ?? "");
          const quality = detectQuality(cellText, imgAlts);

          items.push(quality !== undefined ? { name, quantity, quality } : { name, quantity });
          break; // one item per row
        }
      }
    }

    if (items.length === 0) continue;

    const anchor = bundleName.replace(/\s+/g, "_").replace(/[,]/g, "");
    bundles.push({
      name: bundleName,
      room: currentRoom,
      items: JSON.stringify(items),
      items_required: items_required ?? items.length,
      reward: reward || "Unknown",
      image_url: bundleImageUrl,
      wiki_url: `${WIKI_BASE}/Bundles#${anchor}`,
    });
  }

  console.log(`Scraped ${bundles.length} bundles`);
  return bundles;
}
