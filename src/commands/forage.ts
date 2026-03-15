import { formatDate } from "../constants";
import { getForageable } from "../db";
import { embedResponse, formatPriceTiers, getOption, notFoundResponse, seasonColor } from "./utils";

export function handleForage(
  interaction: Record<string, unknown>,
  sql: SqlStorage,
): Response {
  const name = getOption(interaction, "name");
  const item = getForageable(sql, name);

  if (!item) {
    return notFoundResponse(`No forageable item named **${name}** found. Check the spelling (e.g. \`Daffodil\`, \`Nautilus Shell\`, \`Red Mushroom\`).`);
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

  return embedResponse({
    title: item.name,
    url: item.wiki_url,
    color: seasonColor(item.seasons),
    thumbnail: item.image_url ? { url: item.image_url } : undefined,
    fields: [
      { name: "Season", value: seasonsValue, inline: true },
      { name: "Found",  value: locationsValue, inline: true },
      {
        name: "Sells For",
        value: formatPriceTiers(item.sell_price, item.sell_price_silver, item.sell_price_gold, item.sell_price_iridium),
        inline: true,
      },
      { name: "Energy / Health", value: energyHealthValue, inline: true },
      ...(item.used_in.length > 0
        ? [{ name: "Used In", value: item.used_in.map((u) => `• ${u}`).join("\n").slice(0, 1024), inline: false }]
        : []),
    ],
    footer: item.last_updated
      ? { text: `Data from Stardew Valley Wiki • Last updated ${formatDate(item.last_updated)}` }
      : undefined,
  });
}
