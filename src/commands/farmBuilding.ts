import { DEFAULT_COLOR, formatDate } from "@/constants";
import { getFarmBuilding } from "@/db";
import {
	embedResponse,
	getOption,
	notFoundResponse,
	renderDotList,
} from "./utils";

export function handleFarmBuilding(
	interaction: Record<string, unknown>,
	sql: SqlStorage,
): Response {
	const name = getOption(interaction, "name");
	const building = getFarmBuilding(sql, name);

	if (!building) {
		return notFoundResponse(
			`No farm building named **${name}** found. Check the spelling (e.g. \`Coop\`, \`Barn\`, \`Silo\`).`,
		);
	}

	const materialsValue =
		building.materials.length > 0
			? renderDotList(
					building.materials.map((m) =>
						m.quantity > 1 ? `${m.name} ×${m.quantity}` : m.name,
					),
				)
			: "—";

	const fields: Array<{ name: string; value: string; inline: boolean }> = [
		{
			name: "Cost",
			value: building.cost != null ? `${building.cost.toLocaleString()}g` : "—",
			inline: true,
		},
		{
			name: "Size",
			value: building.size ?? "—",
			inline: true,
		},
		{
			name: "Construction Time",
			value: building.construction_time ?? "—",
			inline: true,
		},
	];

	if (building.materials.length > 0) {
		fields.push({
			name: "Materials",
			value: materialsValue,
			inline: false,
		});
	}

	if (building.animals_housed) {
		fields.push({
			name: "Houses",
			value: building.animals_housed,
			inline: true,
		});
	}

	return embedResponse({
		title: building.name,
		url: building.wiki_url,
		color: DEFAULT_COLOR,
		description: building.description ?? undefined,
		thumbnail: building.image_url ? { url: building.image_url } : undefined,
		fields,
		footer: building.last_updated
			? {
					text: `Data from Stardew Valley Wiki • Last updated ${formatDate(building.last_updated)}`,
				}
			: undefined,
	});
}
