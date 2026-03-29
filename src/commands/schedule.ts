import { formatDate, SEASON_COLORS, SEASONS } from "@/constants";
import { getVillager } from "@/db";
import type { ScheduleEntry } from "@/types";
import { embedResponse, getOption, notFoundResponse } from "./utils";

export function handleSchedule(
	interaction: Record<string, unknown>,
	sql: SqlStorage,
): Response {
	const villagerName = getOption(interaction, "villager");
	const rawSeason = getOption(interaction, "season");
	const season = rawSeason || "Default";
	const dayFilter = getOption(interaction, "day");

	const villager = getVillager(sql, villagerName);
	if (!villager) {
		return notFoundResponse(
			`No villager named **${villagerName}** found. Check the spelling (e.g. \`Maru\`, \`Abigail\`).`,
		);
	}

	const schedule = JSON.parse(villager.schedule || "{}") as Record<
		string,
		Record<string, ScheduleEntry[]>
	>;

	// Find the season key case-insensitively
	let seasonKey = Object.keys(schedule).find(
		(s) => s.toLowerCase() === season.toLowerCase(),
	);

	if (!seasonKey || !schedule[seasonKey]) {
		// Fall back to Default schedule
		seasonKey = "Default";
	}

	const seasonData = schedule[seasonKey];
	if (Object.keys(schedule).length === 0) {
		// Villager has no season data
		return notFoundResponse(`**${villager.name}** has no set schedule.`);
	}
	if (!seasonData) {
		// Villager has no data for the specified season
		return notFoundResponse(
			`**${villager.name}** has no schedule specifically for ${seasonKey}.`,
		);
	}
	const occasions = Object.entries(seasonData);

	// Filter by day/occasion if provided
	const filtered = dayFilter
		? occasions.filter(([occ]) =>
				occ.toLowerCase().includes(dayFilter.toLowerCase()),
			)
		: occasions;

	if (!filtered.length) {
		// If the day has a season prefix that mismatches the specified season, that's
		// likely why nothing matched — surface a more specific error.
		if (rawSeason && dayFilter) {
			const daySeasonPrefix = SEASONS.find((s) =>
				dayFilter.toLowerCase().startsWith(s.toLowerCase()),
			);
			if (
				daySeasonPrefix &&
				daySeasonPrefix.toLowerCase() !== rawSeason.toLowerCase()
			) {
				return notFoundResponse(
					`The day **${dayFilter}** is in **${daySeasonPrefix}**, but you specified season **${rawSeason}**. Did you mean to use season \`${daySeasonPrefix}\`?`,
				);
			}
		}
		return notFoundResponse(
			`No schedule matching **${dayFilter}** found for **${villager.name}** in **${seasonKey}**.`,
		);
	}

	// Build one embed field per occasion (prioritized highest to lowest, as listed on the wiki)
	const fields = filtered.map(([occasion, entries]) => ({
		name: occasion,
		value:
			entries.map((e) => `**${e.time}** — ${e.location}`).join("\n") || "—",
		inline: false,
	}));

	const color = SEASON_COLORS[seasonKey] ?? 0x5b8a3c;

	return embedResponse({
		title: `${villager.name}'s Schedule - ${seasonKey}${dayFilter && filtered.length === 1 ? ` - ${filtered[0]![0]}` : ""}`,
		url: `${villager.wiki_url}#Schedule`,
		thumbnail: villager.image_url ? { url: villager.image_url } : undefined,
		color,
		fields,
		footer: villager.last_updated
			? {
					text: `Data from Stardew Valley Wiki • Last updated ${formatDate(villager.last_updated)}`,
				}
			: undefined,
	});
}
