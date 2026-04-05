import { HTMLElement, parse } from "node-html-parser";
import { rehype } from "rehype";
import rehypeParse from "rehype-parse";
import rehypeRemark from "rehype-remark";
import remarkStringify from "remark-stringify";
import strip from "strip-markdown";
import { SEASONS } from "@/constants";
import type { ScheduleEntry, VillagerRow } from "@/types";
import { fetchPage, WIKI_BASE } from "./wiki";

const GIFT_TIERS = ["loved", "liked", "neutral", "disliked", "hated"] as const;
type GiftTier = (typeof GIFT_TIERS)[number];

const GIFT_HEADING_TO_TIER: Record<string, GiftTier> = {
	Love: "loved",
	Like: "liked",
	Neutral: "neutral",
	Dislike: "disliked",
	Hate: "hated",
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

		const villagersInSection = sec.querySelectorAll(
			":scope + ul li div.gallerytext a",
		);
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
		loved: [],
		liked: [],
		neutral: [],
		disliked: [],
		hated: [],
	};

	const headings = root.querySelectorAll("h3");
	for (const heading of headings) {
		const headingText = heading.text.trim();
		if (!["Love", "Like", "Neutral", "Dislike", "Hate"].includes(headingText))
			continue; // skip non-gift tables{
		const tier = GIFT_HEADING_TO_TIER[headingText] as GiftTier;
		const giftTable = heading.querySelector(":scope ~ table.wikitable")!;

		for (const row of giftTable.querySelectorAll("tr")) {
			const cells = row.querySelectorAll("td");
			if (cells.length < 1) continue;

			const contentAsList = cells[1]?.querySelector(":scope > ul");
			if (contentAsList) {
				const md = rehype()
					.use(rehypeParse, { fragment: true })
					.use(rehypeRemark)
					.use(remarkStringify)
					.use(strip, { keep: ["list", "listItem"] })
					.processSync(contentAsList.innerHTML);
				const text = String(md)
					.replaceAll(/^\*\s/gm, "")
					.replaceAll("\\\*", "")
					.replaceAll(" (except:-", " (except:\n  -")
					.trim();
				const items = text
					.split("\n\n")
					.map((s) => s.trim())
					.filter((s) => s);
				gifts[tier].push(...items);
			} else {
				const item = cells[1]?.text.trim();
				if (item) gifts[tier].push(item);
			}
		}
	}

	return gifts;
}

const SCHEDULE_GROUPS = [...SEASONS, "Marriage"];

/** Extract time/location rows from a wikitable. */
function parseTableEntries(table: HTMLElement): ScheduleEntry[] {
	const entries: ScheduleEntry[] = [];
	for (const row of table.querySelectorAll("tr")) {
		const cells = row.querySelectorAll("td");
		if (cells.length < 2) continue;
		const time = cells[0]!.text.trim();
		const location = cells[1]!.text.replace(/\s+/g, " ").trim();
		if (time && location) entries.push({ time, location });
	}
	return entries;
}

/**
 * Walk the children of a container element, collecting occasion labels (<b> tags)
 * and their associated wikitable entries.
 */
function parseGroupContent(
	container: HTMLElement,
): Record<string, ScheduleEntry[]> {
	const groupData: Record<string, ScheduleEntry[]> = {};
	let currentOccasion = "Regular Schedule";

	for (const child of container.childNodes) {
		const tag = (child as HTMLElement).tagName?.toUpperCase();
		if (!tag) continue; // skip text nodes

		const el = child as HTMLElement;

		if (tag === "P" || tag === "DIV") {
			const bold = el.querySelector("b");
			if (bold) {
				const label = bold.text.trim();
				if (label) currentOccasion = label;
			}
		} else if (tag === "B") {
			const label = el.text.trim();
			if (label) currentOccasion = label;
		} else if (tag === "TABLE" && el.classList?.contains("wikitable")) {
			const entries = parseTableEntries(el);
			if (entries.length > 0) {
				if (!groupData[currentOccasion]) groupData[currentOccasion] = [];
				groupData[currentOccasion]!.push(...entries);
			}
		}
	}

	return groupData;
}

/**
 * Parse schedule data from one villager's HTML page.
 *
 * Handles three wiki layout patterns:
 *
 *   Pass 1 — h3-based groups: some pages use h3 headings ("Spring", "Marriage", etc.)
 *     followed by <b> occasion labels and <table class="wikitable"> rows.
 *
 *   Pass 2 — collapsible group tables: other pages wrap each group in a
 *     <table class="mw-collapsible"> (without "wikitable") whose <th> names the group
 *     and whose <td> contains <b> occasion labels + inner wikitables.
 *
 *   Pass 3 — ungrouped collapsible tables: individual <table class="wikitable mw-collapsible">
 *     tables not inside any group. The occasion name is in the <th> header. These fall
 *     into a synthetic "Default" group.
 *
 * Returns: { Spring: { Rain: [{time,location}], … }, Marriage: { … }, Default: { … }, … }
 */
function parseSchedule(
	html: string,
): Record<string, Record<string, ScheduleEntry[]>> {
	const root = parse(html);
	const result: Record<string, Record<string, ScheduleEntry[]>> = {};

	// ── Pass 1: h3-based grouped schedules ──────────────────────────────────────
	for (const h3 of root.querySelectorAll("h3")) {
		const groupText = h3.text.trim();
		if (!SCHEDULE_GROUPS.includes(groupText)) continue;

		const groupData: Record<string, ScheduleEntry[]> = {};
		let node = h3.nextElementSibling;
		let currentOccasion = "Regular Schedule";

		while (node) {
			const tag = node.tagName?.toUpperCase();
			if (tag === "H3" || tag === "H2") break;

			if (tag === "P" || tag === "DIV") {
				const bold = node.querySelector("b");
				if (bold) {
					const label = bold.text.trim();
					if (label) currentOccasion = label;
				}
			} else if (tag === "B") {
				const label = node.text.trim();
				if (label) currentOccasion = label;
			} else if (tag === "TABLE" && node.classList?.contains("wikitable")) {
				const entries = parseTableEntries(node);
				if (entries.length > 0) {
					if (!groupData[currentOccasion]) groupData[currentOccasion] = [];
					groupData[currentOccasion]!.push(...entries);
				}
			}

			node = node.nextElementSibling;
		}

		if (Object.keys(groupData).length > 0) result[groupText] = groupData;
	}

	// ── Pass 2: collapsible group tables ────────────────────────────────────────
	for (const table of root.querySelectorAll("table.mw-collapsible")) {
		if (table.classList.contains("wikitable")) continue; // individual occasion table — handled in Pass 3

		const th = table.querySelector("th");
		if (!th) continue;

		// The group name lives in a non-toggle <a> link (e.g. <a href="/Winter">Winter</a>)
		const groupLink = th.querySelector("a:not(.mw-collapsible-text)");
		let groupName = groupLink?.text.trim() ?? "";

		if (!groupName) {
			// Fallback: strip the collapsible toggle text and use whatever remains
			const toggleText = th.querySelector(".mw-collapsible-toggle")?.text ?? "";
			groupName = th.text.replace(toggleText, "").replace(/\s+/g, " ").trim();
		}

		if (!groupName || !SCHEDULE_GROUPS.includes(groupName)) continue;
		if (result[groupName]) continue; // already parsed via Pass 1

		const td = table.querySelector("td");
		if (!td) continue;

		const groupData = parseGroupContent(td);
		if (Object.keys(groupData).length > 0) result[groupName] = groupData;
	}

	// ── Pass 3: ungrouped collapsible occasion tables → "Default" group ─────────
	const defaultGroup: Record<string, ScheduleEntry[]> = {};

	for (const table of root.querySelectorAll("table.wikitable.mw-collapsible")) {
		// Skip tables that are nested inside a group-level collapsible (Pass 2 territory)
		let parent = table.parentNode as typeof table | null;
		let insideGroup = false;
		while (parent) {
			const ptag = (parent as HTMLElement).tagName?.toUpperCase();
			if (ptag === "TABLE") {
				const pcl = (parent as HTMLElement).classList;
				if (pcl?.contains("mw-collapsible") && !pcl?.contains("wikitable")) {
					insideGroup = true;
					break;
				}
			}
			parent = (parent as HTMLElement).parentNode as typeof table | null;
		}
		if (insideGroup) continue;

		const th = table.querySelector("th");
		if (!th) continue;

		const toggleText = th.querySelector(".mw-collapsible-toggle")?.text ?? "";
		const occasion = th.text.replace(toggleText, "").trim();
		if (!occasion) continue;

		const entries = parseTableEntries(table);
		if (entries.length > 0) defaultGroup[occasion] = entries;
	}

	if (Object.keys(defaultGroup).length > 0) result["Default"] = defaultGroup;

	return result;
}

/** Parse birthday from one villager's HTML page. */
function parseVillagerDetails(
	name: string,
	html: string,
): {
	birthday: string;
	image_url: string;
} {
	const root = parse(html);
	let birthday = "",
		image_url = "";
	for (const row of root.querySelectorAll("table#infoboxtable tr")) {
		const details = row.querySelectorAll("td");
		for (const detail of details) {
			if (detail.text.trim().toLowerCase() === "birthday") {
				const birthdayField = detail.querySelector(":scope + td");
				if (birthdayField)
					birthday = birthdayField.text.replace(/\s+/g, " ").trim();
			} else {
				const img = detail.querySelector(`:scope img[alt="${name}.png"]`);
				if (img) image_url = WIKI_BASE + img.getAttribute("src");
			}
		}
	}
	return { birthday, image_url };
}

/** Scrape gift + birthday data for all social villagers. */
export async function scrapeVillagers(): Promise<
	Omit<VillagerRow, "id" | "last_updated">[]
> {
	const list = await scrapeVillagerList();
	const results: Omit<VillagerRow, "id" | "last_updated">[] = [];

	// Process in batches to avoid hitting rate limits / time limits
	for (let i = 0; i < list.length; i += BATCH_SIZE) {
		const batch = list.slice(i, i + BATCH_SIZE);
		const settled = await Promise.allSettled(
			batch.map(async ([name, path]) => {
				const html = await fetchPage(path);
				const { birthday, image_url } = parseVillagerDetails(name, html);
				const gifts = parseGifts(html);
				const schedule = parseSchedule(html);
				return {
					name,
					birthday,
					loved_gifts: JSON.stringify(gifts.loved),
					liked_gifts: JSON.stringify(gifts.liked),
					neutral_gifts: JSON.stringify(gifts.neutral),
					disliked_gifts: JSON.stringify(gifts.disliked),
					hated_gifts: JSON.stringify(gifts.hated),
					schedule: JSON.stringify(schedule),
					wiki_url: WIKI_BASE + path,
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
