import { DEFAULT_COLOR, SEASON_COLORS, formatDate } from "../constants";
import { getFish } from "../db";
import { InteractionResponseType } from "../types";

function fishColor(seasons: string[]): number {
  for (const s of seasons) {
    if (s in SEASON_COLORS) return SEASON_COLORS[s]!;
  }
  return DEFAULT_COLOR;
}

export function handleFish(
  interaction: Record<string, unknown>,
  sql: SqlStorage,
): Response {
  const options = (interaction.data as Record<string, unknown>)
    ?.options as Array<{ name: string; value: string }> | undefined;
  const name = options?.find((o) => o.name === "name")?.value ?? "";

  const fish = getFish(sql, name);

  if (!fish) {
    return Response.json({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        content: `No fish named **${name}** found. Check the spelling (e.g. \`Tuna\`, \`Salmon\`, \`Legend\`).`,
        flags: 64, // ephemeral
      },
    });
  }

  const color = fishColor(fish.seasons);

  const fields: { name: string; value: string; inline: boolean }[] = [
    {
      name: "Category",
      value: fish.category,
      inline: true,
    },
    {
      name: "Season",
      value: fish.seasons.length ? fish.seasons.join(", ") : "All Seasons",
      inline: true,
    },
  ];

  if (fish.location) {
    fields.push({ name: "Location", value: fish.location, inline: true });
  }

  fields.push({ name: "Time", value: fish.time ?? "Anytime", inline: true });

  if (fish.weather) {
    fields.push({ name: "Weather", value: fish.weather, inline: true });
  }

  if (fish.min_size != null && fish.max_size != null) {
    fields.push({
      name: "Size",
      value:
        fish.min_size === fish.max_size
          ? `${fish.min_size} inches`
          : `${fish.min_size}–${fish.max_size} inches`,
      inline: true,
    });
  }

  if (fish.difficulty != null) {
    fields.push({
      name: "Difficulty",
      value: fish.behavior ? `${fish.difficulty} (${fish.behavior})` : `${fish.difficulty}`,
      inline: true,
    });
  }

  const sellValue = (
    [
      ["Normal", fish.sell_price],
      ["Silver", fish.sell_price_silver],
      ["Gold", fish.sell_price_gold],
      ["Iridium", fish.sell_price_iridium],
    ] as [string, number | null][]
  )
    .filter(([, price]) => price != null)
    .map(([label, price]) => `${label}: ${(price as number).toLocaleString()}g`)
    .join("\n");

  if (sellValue) {
    fields.push({ name: "Sells For", value: sellValue, inline: true });
  }

  const embed = {
    title: fish.name,
    url: fish.wiki_url,
    color,
    thumbnail: fish.image_url ? { url: fish.image_url } : undefined,
    description: fish.description || undefined,
    fields,
    footer: fish.last_updated
      ? { text: `Data from Stardew Valley Wiki • Last updated ${formatDate(fish.last_updated)}` }
      : undefined,
  };

  return Response.json({
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: { embeds: [embed] },
  });
}
