import { DEFAULT_COLOR, SEASON_COLORS, formatDate } from "../constants";
import { getFruitTree } from "../db";
import { InteractionResponseType } from "../types";

export function handleFruitTree(
  interaction: Record<string, unknown>,
  sql: SqlStorage,
): Response {
  const options = (interaction.data as Record<string, unknown>)
    ?.options as Array<{ name: string; value: string }> | undefined;
  const name = options?.find((o) => o.name === "name")?.value ?? "";

  const tree = getFruitTree(sql, name);

  if (!tree) {
    return Response.json({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        content: `No fruit tree named **${name}** found. Check the spelling (e.g. \`Apricot\`, \`Cherry\`, \`Peach\`).`,
        flags: 64, // ephemeral
      },
    });
  }

  const color = (tree.season && tree.season in SEASON_COLORS)
    ? SEASON_COLORS[tree.season]!
    : DEFAULT_COLOR;

  const embed = {
    title: tree.name,
    url: tree.wiki_url,
    color,
    thumbnail: tree.image_url ? { url: tree.image_url } : undefined,
    fields: [
      {
        name: "Harvest Season",
        value: tree.season || "—",
        inline: true,
      },
      {
        name: "Growth Time",
        value: tree.growth_days != null ? `${tree.growth_days} days` : "—",
        inline: true,
      },
      {
        name: "Sapling Price",
        value: tree.sapling_price != null ? `${tree.sapling_price.toLocaleString()}g` : "—",
        inline: true,
      },
      {
        name: "Fruit",
        value: tree.fruit_name ?? "—",
        inline: true,
      },
      {
        name: "Fruit Sells For",
        value: [
          ["Normal",  tree.sell_price],
          ["Silver",  tree.sell_price_silver],
          ["Gold",    tree.sell_price_gold],
          ["Iridium", tree.sell_price_iridium],
        ]
          .filter(([, price]) => price != null)
          .map(([label, price]) => `${label}: ${(price as number).toLocaleString()}g`)
          .join("\n") || "—",
        inline: true,
      },
    ],
    footer: tree.last_updated
      ? { text: `Data from Stardew Valley Wiki • Last updated ${formatDate(tree.last_updated)}` }
      : undefined,
  };

  return Response.json({
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: { embeds: [embed] },
  });
}
