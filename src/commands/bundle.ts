import { DEFAULT_COLOR, formatDate } from "@/constants";
import { getBundle } from "@/db";
import {
	embedResponse,
	getOption,
	notFoundResponse,
	renderDotForListContent,
} from "./utils";

const ROOM_COLORS: Record<string, number> = {
	"Crafts Room": 0x78b84a,
	Pantry: 0xe8c13a,
	"Fish Tank": 0x4a9fd5,
	"Boiler Room": 0xd2691e,
	"Bulletin Board": 0xe8608a,
	Vault: 0xf5c842,
};

export function handleBundle(
	interaction: Record<string, unknown>,
	sql: SqlStorage,
): Response {
	const query = getOption(interaction, "name");
	const bundle = getBundle(sql, query);

	if (!bundle) {
		return notFoundResponse(
			`No bundle named **${query}** found. Try a partial name like \`Spring Foraging\`, \`Construction\`, or \`Artisan\`.`,
		);
	}

	const isVault = bundle.room === "Vault";
	const isChoice = bundle.items_required < bundle.items.length;

	const itemLines = isVault
		? bundle.items.map(
				(item, _, { length: numItems }) =>
					`${renderDotForListContent(numItems)}${item.quantity.toLocaleString()}g`,
			)
		: bundle.items.map((item) => {
				const qty =
					item.quantity > 1 ? ` ×${item.quantity.toLocaleString()}` : "";
				const quality = item.quality ? ` (${item.quality}+)` : "";
				return `${renderDotForListContent(bundle.items.length)}${item.name}${qty}${quality}`;
			});

	const itemsFieldName = isVault
		? "Purchase Cost"
		: isChoice
			? `Items (choose ${bundle.items_required} of ${bundle.items.length})`
			: "Items Required";

	return embedResponse({
		title: bundle.name,
		url: bundle.wiki_url,
		color: ROOM_COLORS[bundle.room] ?? DEFAULT_COLOR,
		thumbnail: bundle.image_url ? { url: bundle.image_url } : undefined,
		fields: [
			{ name: "Room", value: bundle.room, inline: true },
			{ name: "Reward", value: bundle.reward, inline: true },
			{ name: itemsFieldName, value: itemLines.join("\n") || "—" },
		],
		footer: {
			text: `Data from Stardew Valley Wiki • Last updated ${formatDate(bundle.last_updated)}`,
		},
	});
}
