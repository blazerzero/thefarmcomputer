import { DEFAULT_COLOR, formatDate } from "@/constants";
import { getBait } from "@/db";
import { embedResponse, getOption, notFoundResponse } from "./utils";

export function handleBait(
	interaction: Record<string, unknown>,
	sql: SqlStorage,
): Response {
	const name = getOption(interaction, "name");
	const bait = getBait(sql, name);

	if (!bait) {
		return notFoundResponse(
			`No bait named **${name}** found. Check the spelling (e.g. \`Wild Bait\`, \`Magic Bait\`, \`Deluxe Bait\`).`,
		);
	}

	const fields: { name: string; value: string; inline: boolean }[] = [];

	if (bait.purchase && bait.purchase !== "N/A") {
		fields.push({ name: "Purchase", value: bait.purchase, inline: true });
	}

	if (bait.ingredients.length > 0) {
		const ingredientLines = bait.ingredients.map(
			(ing) => `${ing.name} (${ing.quantity})`,
		);
		fields.push({
			name: "Crafting",
			value: ingredientLines.join("\n"),
			inline: true,
		});
	}

	if (bait.notes) {
		fields.push({ name: "Notes", value: bait.notes, inline: false });
	}

	return embedResponse({
		title: bait.name,
		url: bait.wiki_url,
		color: DEFAULT_COLOR,
		thumbnail: bait.image_url ? { url: bait.image_url } : undefined,
		description: bait.description || undefined,
		fields,
		footer: bait.last_updated
			? {
					text: `Data from Stardew Valley Wiki • Last updated ${formatDate(bait.last_updated)}`,
				}
			: undefined,
	});
}
