export const SEASONS: readonly string[] = [
	"Spring",
	"Summer",
	"Fall",
	"Winter",
];
export type Season = "Spring" | "Summer" | "Fall" | "Winter";

export const SEASON_COLORS: Record<string, number> = {
	Spring: 0x78b84a,
	Summer: 0xe8c13a,
	Fall: 0xd2691e,
	Winter: 0x89cff0,
};

export const DEFAULT_COLOR = 0x5b8a3c;

export function formatDate(iso: string): string {
	return new Date(iso).toLocaleDateString("en-US", {
		month: "long",
		day: "numeric",
		year: "numeric",
		timeZone: "UTC",
	});
}
