import { formatDate } from "@/constants";
import { getCrystalarium } from "@/db";
import { embedResponse, getOption, notFoundResponse } from "./utils";

export function handleCrystalarium(
	interaction: Record<string, unknown>,
	sql: SqlStorage,
): Response {
	const name = getOption(interaction, "name");
	const entry = getCrystalarium(sql, name);

	if (!entry) {
		return notFoundResponse(
			`No Crystalarium entry for **${name}** found. Check the spelling (e.g. \`Diamond\`, \`Aquamarine\`, \`Ruby\`).`,
		);
	}

	const fields: Array<{ name: string; value: string; inline: boolean }> = [];

	if (entry.sell_price !== null) {
		fields.push({
			name: "Sells For",
			value: `${entry.sell_price}g`,
			inline: true,
		});
	}

	if (entry.processing_time !== null) {
		fields.push({
			name: "Processing Time",
			value: entry.processing_time,
			inline: true,
		});
	}

	if (entry.gold_per_day !== null) {
		fields.push({
			name: "Gold/Day",
			value: `${entry.gold_per_day}g/day`,
			inline: true,
		});
	}

	return embedResponse({
		title: entry.name,
		url: entry.wiki_url,
		color: 0xc084fc,
		thumbnail: entry.image_url ? { url: entry.image_url } : undefined,
		fields,
		footer: {
			text: `Data from Stardew Valley Wiki • Last updated ${formatDate(entry.last_updated)}`,
		},
	});
}
