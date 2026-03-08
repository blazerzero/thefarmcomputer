import { getCrop } from "../db.js";
import { InteractionResponseType } from "../types.js";
import type { Env } from "../types.js";

const SEASON_COLOURS: Record<string, number> = {
  Spring: 0x78b84a,
  Summer: 0xe8c13a,
  Fall:   0xd2691e,
  Winter: 0x89cff0,
};
const DEFAULT_COLOUR = 0x5b8a3c;

function seasonColour(seasons: string[]): number {
  for (const s of seasons) {
    if (s in SEASON_COLOURS) return SEASON_COLOURS[s]!;
  }
  return DEFAULT_COLOUR;
}

export async function handleCrop(
  interaction: Record<string, unknown>,
  env: Env,
): Promise<Response> {
  const options = (interaction.data as Record<string, unknown>)
    ?.options as Array<{ name: string; value: string }> | undefined;
  const name = options?.find((o) => o.name === "name")?.value ?? "";

  const crop = await getCrop(env.DB, name);

  if (!crop) {
    return Response.json({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        content: `No crop named **${name}** found. Check the spelling (e.g. \`Parsnip\`, \`Blueberry\`).`,
        flags: 64, // ephemeral
      },
    });
  }

  const colour = seasonColour(crop.seasons);
  const embed = {
    title: crop.name,
    url: crop.wiki_url,
    color: colour,
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
        name: "Buy Price",
        value: crop.buy_price != null ? `${crop.buy_price.toLocaleString()}g` : "—",
        inline: true,
      },
      {
        name: "Sell Price",
        value: crop.sell_price != null ? `${crop.sell_price.toLocaleString()}g` : "—",
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
