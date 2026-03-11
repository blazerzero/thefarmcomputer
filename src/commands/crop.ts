import { getCrop } from "../db";
import { InteractionResponseType } from "../types";

const SEASON_COLORS: Record<string, number> = {
  Spring: 0x78b84a,
  Summer: 0xe8c13a,
  Fall:   0xd2691e,
  Winter: 0x89cff0,
};
const DEFAULT_COLOR = 0x5b8a3c;

function seasonColor(seasons: string[]): number {
  for (const s of seasons) {
    if (s in SEASON_COLORS) return SEASON_COLORS[s]!;
  }
  return DEFAULT_COLOR;
}

export function handleCrop(
  interaction: Record<string, unknown>,
  sql: SqlStorage,
): Response {
  const options = (interaction.data as Record<string, unknown>)
    ?.options as Array<{ name: string; value: string }> | undefined;
  const name = options?.find((o) => o.name === "name")?.value ?? "";

  const crop = getCrop(sql, name);

  if (!crop) {
    return Response.json({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        content: `No crop named **${name}** found. Check the spelling (e.g. \`Parsnip\`, \`Blueberry\`).`,
        flags: 64, // ephemeral
      },
    });
  }

  const color = seasonColor(crop.seasons);
  const embed = {
    title: crop.name,
    url: crop.wiki_url,
    color,
    thumbnail: crop.image_url ? { url: crop.image_url } : undefined,
    fields: [
      {
        name: "Seasons",
        value: crop.seasons.length ? crop.seasons.join(", ") : "—",
        inline: true,
      },
      {
        name: "Growth Time",
        value: crop.growth_days != null ? `${crop.growth_days} days` : "—",
        inline: true,
      },
      {
        name: "Regrowth",
        value: crop.regrowth_days != null ? `${crop.regrowth_days} days` : "Single harvest",
        inline: true,
      },
      {
        name: "Seed Price",
        value: crop.buy_price != null ? `${crop.buy_price.toLocaleString()}g` : "—",
        inline: true,
      },
      {
        name: "Sells For",
        value: [
          ["Normal",  crop.sell_price],
          ["Silver",  crop.sell_price_silver],
          ["Gold",    crop.sell_price_gold],
          ["Iridium", crop.sell_price_iridium],
        ]
          .filter(([, price]) => price != null)
          .map(([label, price]) => `${label}: ${(price as number).toLocaleString()}g`)
          .join("\n") || "—",
        inline: true,
      },
      {
        name: "Trellis",
        value: crop.is_trellis ? "Yes" : "No",
        inline: true,
      },
    ],
    footer: crop.last_updated
      ? { text: `Data from Stardew Valley Wiki • Last updated ${crop.last_updated.slice(0, 10)}` }
      : undefined,
  };

  return Response.json({
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: { embeds: [embed] },
  });
}
