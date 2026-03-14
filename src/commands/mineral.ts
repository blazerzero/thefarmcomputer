import { formatDate } from "../constants";
import { getMineral } from "../db";
import { InteractionResponseType } from "../types";
import type { SqlStorage } from "@cloudflare/workers-types";

export function handleMineral(
  interaction: Record<string, unknown>,
  sql: SqlStorage,
): Response {
  const options = (interaction.data as Record<string, unknown>)
    ?.options as Array<{ name: string; value: string }> | undefined;
  const name = options?.find((o) => o.name === "name")?.value ?? "";

  const mineral = getMineral(sql, name);

  if (!mineral) {
    return Response.json({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        content: `No mineral named **${name}** found. Check the spelling (e.g. \`Quartz\`, \`Emerald\`, \`Frozen Geode\`).`,
        flags: 64, // ephemeral
      },
    });
  }

  const fields: Array<{ name: string; value: string; inline: boolean }> = [
    { name: "Category", value: mineral.category, inline: true },
  ];

  if (mineral.sell_price !== null) {
    fields.push({ name: "Sell Price", value: `${mineral.sell_price}g`, inline: true });
  }

  if (mineral.sell_price_gemologist !== null) {
    fields.push({ name: "Gemologist Price", value: `${mineral.sell_price_gemologist}g`, inline: true });
  }

  if (mineral.source) {
    fields.push({ name: "Source", value: mineral.source, inline: false });
  }

  if (mineral.used_in.length > 0) {
    fields.push({
      name: "Used In",
      value: mineral.used_in.map((u) => `• ${u}`).join("\n").slice(0, 1024),
      inline: false,
    });
  }

  const embed: Record<string, unknown> = {
    title: mineral.name,
    url: mineral.wiki_url,
    color: 0x8b5cf6,
    description: mineral.description ?? undefined,
    thumbnail: mineral.image_url ? { url: mineral.image_url } : undefined,
    fields,
    footer: { text: `Last updated ${formatDate(mineral.last_updated)}` },
  };

  return Response.json({
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: { embeds: [embed] },
  });
}
