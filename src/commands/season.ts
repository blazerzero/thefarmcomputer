import { getCropsBySeason } from "../db";
import { DEFAULT_COLOR, SEASON_COLORS } from "../constants";
import { InteractionResponseType } from "../types";

const VALID_SEASONS = new Set(["Spring", "Summer", "Fall", "Winter"]);

function normalize(input: string): string {
  return input.trim().charAt(0).toUpperCase() + input.trim().slice(1).toLowerCase();
}

export function handleSeason(
  interaction: Record<string, unknown>,
  sql: SqlStorage,
): Response {
  const options = (interaction.data as Record<string, unknown>)
    ?.options as Array<{ name: string; value: string }> | undefined;
  const raw = options?.find((o) => o.name === "season")?.value ?? "";
  const season = normalize(raw);

  if (!VALID_SEASONS.has(season)) {
    return Response.json({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        content: `**${raw}** isn't a valid season. Choose from: Spring, Summer, Fall, Winter.`,
        flags: 64, // ephemeral
      },
    });
  }

  const crops = getCropsBySeason(sql, season);

  if (crops.length === 0) {
    return Response.json({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        content: `No crops found for **${season}**.`,
        flags: 64, // ephemeral
      },
    });
  }

  const lines = crops.map((c) => {
    const growth = c.growth_days != null ? `${c.growth_days}d` : "?";
    const regrowth = c.regrowth_days != null ? ` (+${c.regrowth_days}d)` : "";
    const price = c.sell_price != null ? ` — sell for ${c.sell_price}g` : "";
    return `• [${c.name}](${c.wiki_url}) — ${growth}${regrowth} grow${price}`;
  });

  // Discord embed field values max out at 1024 chars; split into columns if needed
  const half = Math.ceil(lines.length / 2);
  const col1 = lines.slice(0, half).join("\n");
  const col2 = lines.slice(half).join("\n");

  const fields =
    col2.length > 0
      ? [
          { name: "\u200b", value: col1, inline: true },
          { name: "\u200b", value: col2, inline: true },
        ]
      : [{ name: "\u200b", value: col1, inline: false }];

  const color = SEASON_COLORS[season] ?? DEFAULT_COLOR;

  return Response.json({
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      embeds: [
        {
          title: `${season} Crops (${crops.length})`,
          color,
          fields,
          footer: { text: "Growth shown as days to first harvest. (+N) = regrowth. Sell price is base quality." },
        },
      ],
    },
  });
}
