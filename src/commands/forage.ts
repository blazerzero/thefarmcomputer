import { DEFAULT_COLOR, SEASON_COLORS, formatDate } from "../constants";
import { getForageable } from "../db";
import { InteractionResponseType } from "../types";

function forageColor(seasons: string[]): number {
  if (seasons.length > 0 && seasons[0]! in SEASON_COLORS) return SEASON_COLORS[seasons[0]!]!;
  return DEFAULT_COLOR;
}

export function handleForage(
  interaction: Record<string, unknown>,
  sql: SqlStorage,
): Response {
  const options = (interaction.data as Record<string, unknown>)
    ?.options as Array<{ name: string; value: string }> | undefined;
  const name = options?.find((o) => o.name === "name")?.value ?? "";

  const item = getForageable(sql, name);

  if (!item) {
    return Response.json({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        content: `No forageable item named **${name}** found. Check the spelling (e.g. \`Daffodil\`, \`Nautilus Shell\`, \`Red Mushroom\`).`,
        flags: 64, // ephemeral
      },
    });
  }

  const seasonsValue =
    item.seasons.length === 0 ? "All Seasons" : item.seasons.join(", ");

  const locationsValue =
    item.locations.length === 0
      ? "—"
      : item.locations.map((l) => `• ${l}`).join("\n").slice(0, 1024);

  const energyHealthValue =
    item.energy != null && item.health != null
      ? `${item.energy} energy / ${item.health} health`
      : item.energy != null
        ? `${item.energy} energy`
        : "—";

  const embed = {
    title: item.name,
    url: item.wiki_url,
    color: forageColor(item.seasons),
    thumbnail: item.image_url ? { url: item.image_url } : undefined,
    fields: [
      {
        name: "Season",
        value: seasonsValue,
        inline: true,
      },
      {
        name: "Found",
        value: locationsValue,
        inline: true,
      },
      {
        name: "Sells For",
        value:
          [
            ["Normal",  item.sell_price],
            ["Silver",  item.sell_price_silver],
            ["Gold",    item.sell_price_gold],
            ["Iridium", item.sell_price_iridium],
          ]
            .filter(([, price]) => price != null)
            .map(([label, price]) => `${label}: ${(price as number).toLocaleString()}g`)
            .join("\n") || "—",
        inline: true,
      },
      {
        name: "Energy / Health",
        value: energyHealthValue,
        inline: true,
      },
      ...(item.used_in.length > 0
        ? [
            {
              name: "Used In",
              value: item.used_in.join(", ").slice(0, 1024),
              inline: false,
            },
          ]
        : []),
    ],
    footer: item.last_updated
      ? { text: `Data from Stardew Valley Wiki • Last updated ${formatDate(item.last_updated)}` }
      : undefined,
  };

  return Response.json({
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: { embeds: [embed] },
  });
}
