import { DEFAULT_COLOR, SEASON_COLORS, SEASONS } from "../constants";
import { getCropsBySeason } from "../db";
import { InteractionResponseType } from "../types";
import { getOption, notFoundResponse, renderDotForListContent } from "./utils";

const VALID_SEASONS = new Set(SEASONS);

function normalize(input: string): string {
  return input.trim().charAt(0).toUpperCase() + input.trim().slice(1).toLowerCase();
}

export function handleSeason(
  interaction: Record<string, unknown>,
  sql: SqlStorage,
): Response {
  const raw = getOption(interaction, "season");
  const season = normalize(raw);

  if (!VALID_SEASONS.has(season)) {
    return notFoundResponse(`**${raw}** isn't a valid season. Choose from: Spring, Summer, Fall, Winter.`);
  }

  const crops = getCropsBySeason(sql, season);

  if (crops.length === 0) {
    return notFoundResponse(`No crops found for **${season}**.`);
  }

  const lines = crops.map((c, _, {length: numCrops}) => {
    const growth = c.growth_days != null ? `${c.growth_days}d` : "?";
    const regrowth = c.regrowth_days != null ? ` (+${c.regrowth_days}d)` : "";
    const price = c.sell_price != null ? ` — ${c.sell_price}g` : "";
    return `${renderDotForListContent(numCrops)}[${c.name}](${c.wiki_url}) — ${growth}${regrowth} grow${price}`;
  });

  // Discord embed field values max out at 1024 chars; split into columns if needed
  const half = Math.ceil(lines.length / 2);
  const col1 = lines.slice(0, half).join("\n");
  const col2 = lines.slice(half).join("\n");

  const fields =
    col2.length > 0
      ? [
          { name: "", value: col1, inline: true },
          { name: "", value: col2, inline: true },
        ]
      : [{ name: "", value: col1, inline: false }];

  return Response.json({
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      embeds: [
        {
          title: `${season} Crops (${crops.length})`,
          color: SEASON_COLORS[season] ?? DEFAULT_COLOR,
          fields,
          footer: { text: "Growth shown as days to first harvest. (+N) = regrowth. Sell value is for base quality." },
        },
      ],
    },
  });
}
