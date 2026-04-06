import { formatDate } from "@/constants";
import { getTool } from "@/db";
import {
	embedResponse,
	getOption,
	notFoundResponse,
	renderDotList,
} from "./utils";

const TOOL_COLOR = 0x8b6914;

export function handleTool(
	interaction: Record<string, unknown>,
	sql: SqlStorage,
): Response {
	const name = getOption(interaction, "name");
	const tool = getTool(sql, name);

	if (!tool) {
		return notFoundResponse(
			`No tool named **${name}** found. Check the spelling (e.g. \`Copper Hoe\`, \`Iridium Pickaxe\`, \`Iridium Rod\`).`,
		);
	}

	const fields: Array<{ name: string; value: string; inline: boolean }> = [];

	if (tool.category) {
		fields.push({ name: "Type", value: tool.category, inline: true });
	}

	if (tool.cost) {
		fields.push({ name: "Cost", value: tool.cost, inline: true });
	}

	if (tool.ingredients.length) {
		fields.push({
			name: "Ingredients",
			value: renderDotList(tool.ingredients),
			inline: false,
		});
	}

	if (tool.improvements.length) {
		fields.push({
			name: "Uses / Improvements",
			value: renderDotList(tool.improvements),
			inline: false,
		});
	}

	if (tool.location.length) {
		fields.push({
			name: "Location",
			value: renderDotList(tool.location),
			inline: false,
		});
	}

	if (tool.requirements.length) {
		fields.push({
			name: "Requirements",
			value: renderDotList(tool.requirements),
			inline: false,
		});
	}

	return embedResponse({
		title: tool.name,
		description: tool.description ?? undefined,
		url: tool.wiki_url,
		color: TOOL_COLOR,
		thumbnail: tool.image_url ? { url: tool.image_url } : undefined,
		fields,
		footer: {
			text: `Data from Stardew Valley Wiki • Last updated ${formatDate(tool.last_updated)}`,
		},
	});
}
