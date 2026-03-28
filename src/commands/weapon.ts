import { formatDate } from "../constants";
import { getWeapon } from "../db";
import {
	embedResponse,
	getOption,
	notFoundResponse,
	sign,
	unbulletList,
} from "./utils";

const WEAPON_COLOR = 0xc0392b;

export function handleWeapon(
	interaction: Record<string, unknown>,
	sql: SqlStorage,
): Response {
	const name = getOption(interaction, "name");
	const weapon = getWeapon(sql, name);

	if (!weapon) {
		return notFoundResponse(
			`No weapon named **${name}** found. Check the spelling (e.g. \`Infinity Blade\`, \`Wood Club\`, \`Elf Blade\`).`,
		);
	}

	const fields: Array<{ name: string; value: string; inline: boolean }> = [];

	fields.push({ name: "Type", value: weapon.category, inline: true });

	if (weapon.level !== null) {
		fields.push({ name: "Level", value: String(weapon.level), inline: true });
	}

	if (weapon.min_damage !== null && weapon.max_damage !== null) {
		const dmg =
			weapon.min_damage === weapon.max_damage
				? String(weapon.min_damage)
				: `${weapon.min_damage}–${weapon.max_damage}`;
		fields.push({ name: "Damage", value: dmg, inline: true });
	}

	let statLines: string[] = [];
	if (weapon.speed !== null) statLines.push(`• Speed ${sign(weapon.speed)}`);
	if (weapon.defense !== null)
		statLines.push(`• Defense ${sign(weapon.defense)}`);
	if (weapon.weight !== null) statLines.push(`• Weight ${sign(weapon.weight)}`);
	if (weapon.crit_chance !== null)
		statLines.push(`• Crit. Chance ${sign(weapon.crit_chance)}`);
	if (weapon.crit_power !== null)
		statLines.push(`• Crit. Power ${sign(weapon.crit_power)}`);
	if (statLines.length > 0) {
		if (statLines.length === 1) statLines = unbulletList(statLines);
		fields.push({ name: "Stats", value: statLines.join("\n"), inline: true });
	}

	if (weapon.extra_stats) {
		try {
			const extras = JSON.parse(weapon.extra_stats) as Array<{
				name: string;
				value: string;
			}>;
			if (extras.length > 0) {
				let extraItems = extras.map((e) => {
					if (e.value) return `• ${e.name}: ${e.value}`;
					else return `• ${e.name}`;
				});
				if (extras.length === 1) extraItems = unbulletList(extraItems);
				const text = extraItems.join("\n");
				fields.push({ name: "Other Stats", value: text, inline: true });
			}
		} catch {
			/* malformed JSON — skip */
		}
	}

	fields.push({
		name: "Location",
		value: weapon.location || "N/A",
		inline: true,
	});

	fields.push({
		name: "Purchase Price",
		value: weapon.purchase_price ? `${weapon.purchase_price}g` : "N/A",
		inline: true,
	});

	fields.push({
		name: "Sells For",
		value: weapon.sell_price ? `${weapon.sell_price}g` : "N/A",
		inline: true,
	});

	return embedResponse({
		title: weapon.name,
		description: weapon.description ?? undefined,
		url: weapon.wiki_url,
		color: WEAPON_COLOR,
		thumbnail: weapon.image_url ? { url: weapon.image_url } : undefined,
		fields,
		footer: {
			text: `Data from Stardew Valley Wiki • Last updated ${formatDate(weapon.last_updated)}`,
		},
	});
}
