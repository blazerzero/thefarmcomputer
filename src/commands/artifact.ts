import { formatDate } from "@/constants";
import { getArtifact } from "@/db";
import {
	embedResponse,
	getOption,
	notFoundResponse,
	renderDotList,
} from "./utils";

export function handleArtifact(
	interaction: Record<string, unknown>,
	sql: SqlStorage,
): Response {
	const name = getOption(interaction, "name");
	const artifact = getArtifact(sql, name);

	if (!artifact) {
		return notFoundResponse(
			`No artifact named **${name}** found. Check the spelling (e.g. \`Dwarvish Helm\`, \`Ancient Sword\`, \`Chub\`).`,
		);
	}

	const fields: Array<{ name: string; value: string; inline: boolean }> = [];

	if (artifact.sell_price !== null) {
		fields.push({
			name: "Sells For",
			value: `${artifact.sell_price}g`,
			inline: true,
		});
	}

	if (artifact.location.length > 0) {
		fields.push({
			name: "Location",
			value: renderDotList(artifact.location),
			inline: false,
		});
	}

	return embedResponse({
		title: artifact.name,
		url: artifact.wiki_url,
		color: 0x8b6914,
		description: artifact.description ?? undefined,
		thumbnail: artifact.image_url ? { url: artifact.image_url } : undefined,
		fields,
		footer: {
			text: `Data from Stardew Valley Wiki • Last updated ${formatDate(artifact.last_updated)}`,
		},
	});
}
