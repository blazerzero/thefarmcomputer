import { formatDate } from "../constants";
import { getMineral } from "../db";
import { embedResponse, getOption, notFoundResponse, renderDotList } from "./utils";

export function handleMineral(
  interaction: Record<string, unknown>,
  sql: SqlStorage,
): Response {
  const name = getOption(interaction, "name");
  const mineral = getMineral(sql, name);

  if (!mineral) {
    return notFoundResponse(`No mineral named **${name}** found. Check the spelling (e.g. \`Quartz\`, \`Emerald\`, \`Frozen Geode\`).`);
  }

  const fields: Array<{ name: string; value: string; inline: boolean }> = [
    { name: "Category", value: mineral.category, inline: true },
  ];

  if (mineral.sell_price !== null) {
    fields.push({ name: "Sells For", value: `${mineral.sell_price}g`, inline: true });
  }

  if (mineral.sell_price_gemologist !== null) {
    fields.push({ name: "Gemologist Price", value: `${mineral.sell_price_gemologist}g`, inline: true });
  }

  if (mineral.source.length > 0) {
    fields.push({
      name: "Source",
      value: renderDotList(mineral.source),
      inline: false,
    });
  }

  if (mineral.used_in.length > 0) {
    fields.push({
      name: "Used In",
      value: renderDotList(mineral.used_in),
      inline: false,
    });
  }

  return embedResponse({
    title: mineral.name,
    url: mineral.wiki_url,
    color: 0x8b5cf6,
    description: mineral.description ?? undefined,
    thumbnail: mineral.image_url ? { url: mineral.image_url } : undefined,
    fields,
    footer: { text: `Data from Stardew Valley Wiki • Last updated ${formatDate(mineral.last_updated)}` },
  });
}
