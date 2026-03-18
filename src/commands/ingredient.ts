import pluralize from "pluralize";
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

  const recipes: string[] = items.reduce((acc, curr) => {
    const idx = curr.ingredients.findIndex((i) => i.name.toLowerCase() === name.toLowerCase());
    if (idx >= 0) acc.push(`${curr.name} (${curr.ingredients[idx]!.quantity} needed)`);
    return acc;
  }, [] as string[]);
  const lastUpdated = items[0]!.last_updated;

  return embedResponse({
    title: `${items.length} ${pluralize('recipe', items.length)} using ${name}`,
    color: CRAFT_COLOR,
    fields: [
      {
        name: "Recipes",
        value: renderDotList(recipes),
        inline: false,
      },
    ],
    footer: { text: `Data from Stardew Valley Wiki • Last updated ${formatDate(lastUpdated)}` },
  });
}
