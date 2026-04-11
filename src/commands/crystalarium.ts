import { formatDate } from "@/constants";
import { getCrystalariumItem } from "@/db";
import {
	embedResponse,
	formatGameDuration,
	getOption,
	notFoundResponse,
} from "./utils";

export function handleCrystalarium(
	interaction: Record<string, unknown>,
	sql: SqlStorage,
): Response {
	const name = getOption(interaction, "name");
	const entry = getCrystalariumItem(sql, name);

	if (!entry) {
		return notFoundResponse(
			`No Crystalarium item entry for **${name}** found. Check the spelling (e.g. \`Diamond\`, \`Aquamarine\`, \`Ruby\`).`,
		);
	}

	const fields: Array<{ name: string; value: string; inline: boolean }> = [];

	if (entry.sell_price !== null) {
		fields.push({
			name: "Sell Value Per Gem",
			value: `${entry.sell_price}g`,
			inline: true,
		});
	}

	if (entry.processing_time !== null) {
		fields.push({
			name: "Time to Duplicate",
			value: formatGameDuration(entry.processing_time),
			inline: true,
		});
	}

	return embedResponse({
		title: entry.name,
		description:
			"The Crystalarium will create copies of any gem placed into it.",
		url: entry.wiki_url,
		color: 0xc084fc,
		thumbnail: entry.image_url ? { url: entry.image_url } : undefined,
		fields,
		footer: {
			text: `Data from Stardew Valley Wiki • Last updated ${formatDate(entry.last_updated)}`,
		},
	});
}
