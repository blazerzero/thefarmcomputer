import { formatDate } from "../constants";
import { getCraftedItemsByIngredient } from "../db";
import { embedResponse, getOption, notFoundResponse, renderDotList } from "./utils";

const CRAFT_COLOR = 0xd97706;

export function handleIngredient(
  interaction: Record<string, unknown>,
  sql: SqlStorage,
): Response {
  const name = getOption(interaction, "name");
  const items = getCraftedItemsByIngredient(sql, name);

  if (items.length === 0) {
    return notFoundResponse(
      `No crafting recipes found that use **${name}** as an ingredient. Check the spelling (e.g. \`Wood\`, \`Stone\`, \`Iron Bar\`).`,
    );
  }

  const recipeLinks = items.map((item) => `[${item.name}](${item.wiki_url})`);
  const lastUpdated = items[0]!.last_updated;

  return embedResponse({
    title: `Recipes using ${name}`,
    color: CRAFT_COLOR,
    fields: [
      {
        name: `${items.length} recipe${items.length === 1 ? "" : "s"}`,
        value: renderDotList(recipeLinks),
        inline: false,
      },
    ],
    footer: { text: `Data from Stardew Valley Wiki • Last updated ${formatDate(lastUpdated)}` },
  });
}
