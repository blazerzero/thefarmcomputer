import { formatDate } from "../constants";
import { getVillager } from "../db";
import type { Villager } from "../types";
import {
	embedResponse,
	getOption,
	notFoundResponse,
	renderDotList,
} from "./utils";

const EMBED_COLOR = 0xe8608a;

const TIERS: Array<{ key: keyof Villager; label: string }> = [
	{ key: "loved_gifts", label: "❤️ Loved" },
	{ key: "liked_gifts", label: "😊 Liked" },
	{ key: "neutral_gifts", label: "😐 Neutral" },
	{ key: "disliked_gifts", label: "😒 Disliked" },
	{ key: "hated_gifts", label: "😡 Hated" },
];

function formatList(items: string[]): string {
	if (!items.length) return "—";
	return renderDotList(items);
}

export function handleGift(
	interaction: Record<string, unknown>,
	sql: SqlStorage,
): Response {
	const name = getOption(interaction, "villager");
	let tierFilter = (
		(interaction.data as Record<string, unknown>)?.options as
			| Array<{ name: string; value: string }>
			| undefined
	)?.find((o) => o.name === "tier")?.value;
	if (tierFilter && !tierFilter.endsWith("_gifts")) tierFilter += "_gifts";

	const villager = getVillager(sql, name);

	if (!villager) {
		return notFoundResponse(
			`No villager named **${name}** found. Check the spelling (e.g. \`Abigail\`, \`Harvey\`).`,
		);
	}

	const activeTiers = tierFilter
		? TIERS.filter((t) => t.key === tierFilter)
		: TIERS;

	const fields = activeTiers.map(({ key, label }) => ({
		name: label,
		value: formatList(villager[key] as string[]),
		inline: false,
	}));

	return embedResponse({
		title: villager.name,
		url: villager.wiki_url,
		thumbnail: villager.image_url ? { url: villager.image_url } : undefined,
		color: EMBED_COLOR,
		description: villager.birthday
			? `🎂 Birthday: **${villager.birthday}**`
			: undefined,
		fields,
		footer: villager.last_updated
			? {
					text: `Data from Stardew Valley Wiki • Last updated ${formatDate(villager.last_updated)}`,
				}
			: undefined,
	});
}
