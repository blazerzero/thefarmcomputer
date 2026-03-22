import { describe, expect, it } from "vitest";
import { handleSchedule } from "../../commands/schedule";
import { type DiscordResponse, type EmbedField, makeSql } from "../helpers";

const fakeVillagerRow = {
	name: "Harvey",
	birthday: "Fall 14",
	loved_gifts: '["Coffee","Pickles"]',
	liked_gifts: '["Wine"]',
	neutral_gifts: "[]",
	disliked_gifts: "[]",
	hated_gifts: "[]",
	schedule: JSON.stringify({
		Default: {
			Default: [
				{ time: "9am", location: "Harvey's Clinic" },
				{ time: "1pm", location: "The Saloon" },
			],
			Rain: [
				{ time: "9am", location: "Harvey's Clinic" },
				{ time: "5pm", location: "Harvey's Clinic" },
			],
		},
		Spring: {
			Default: [
				{ time: "8am", location: "Town Square" },
				{ time: "3pm", location: "Harvey's Clinic" },
			],
		},
	}),
	wiki_url: "https://stardewvalleywiki.com/Harvey",
	image_url: "https://example.com/harvey.png",
	last_updated: "2024-03-01T00:00:00.000Z",
};

function makeInteraction(villager: string, day?: string, season?: string) {
	const options: Array<{ name: string; value: string }> = [{ name: "villager", value: villager }];
	if (day) options.push({ name: "day", value: day });
	if (season) options.push({ name: "season", value: season });
	return { data: { options } };
}

describe("handleSchedule", () => {
	it("returns an embed with the villager's schedule title", async () => {
		const res = handleSchedule(makeInteraction("harvey"), makeSql([fakeVillagerRow]));
		const json = (await res.json()) as DiscordResponse;

		const embed = json.data.embeds?.[0];
		expect(embed?.title).toBe("Harvey's Schedule");
		expect(embed?.url).toContain("Harvey");
		expect(embed?.url).toContain("#Schedule");
	});

	it("returns all occasions when no day filter is given", async () => {
		const res = handleSchedule(makeInteraction("harvey"), makeSql([fakeVillagerRow]));
		const json = (await res.json()) as DiscordResponse;
		const fields = json.data.embeds?.[0]?.fields as EmbedField[];

		expect(fields.map((f) => f.name)).toContain("Default");
		expect(fields.map((f) => f.name)).toContain("Rain");
	});

	it("filters occasions by day when a day filter is provided", async () => {
		const res = handleSchedule(makeInteraction("harvey", "rain"), makeSql([fakeVillagerRow]));
		const json = (await res.json()) as DiscordResponse;
		const fields = json.data.embeds?.[0]?.fields as EmbedField[];

		expect(fields).toHaveLength(1);
		expect(fields[0]?.name).toBe("Rain");
		expect(fields[0]?.value).toContain("Harvey's Clinic");
	});

	it("returns a schedule for a specific season", async () => {
		const res = handleSchedule(
			makeInteraction("harvey", undefined, "spring"),
			makeSql([fakeVillagerRow]),
		);
		const json = (await res.json()) as DiscordResponse;
		const fields = json.data.embeds?.[0]?.fields as EmbedField[];

		expect(fields[0]?.name).toBe("Default");
		expect(fields[0]?.value).toContain("Town Square");
	});

	it("returns an ephemeral error for an unknown villager", async () => {
		const res = handleSchedule(makeInteraction("xyz"), makeSql([]));
		const json = (await res.json()) as DiscordResponse;

		expect(json.data.flags).toBe(64);
		expect(json.data.content).toContain("No villager named");
	});

	it("returns an ephemeral error when the season is not found", async () => {
		const res = handleSchedule(
			makeInteraction("harvey", undefined, "winter"),
			makeSql([fakeVillagerRow]),
		);
		const json = (await res.json()) as DiscordResponse;

		expect(json.data.flags).toBe(64);
		expect(json.data.content).toContain("No");
	});

	it("returns an ephemeral error when no occasion matches the day filter", async () => {
		const res = handleSchedule(makeInteraction("harvey", "festival"), makeSql([fakeVillagerRow]));
		const json = (await res.json()) as DiscordResponse;

		expect(json.data.flags).toBe(64);
		expect(json.data.content).toContain("festival");
	});
});
