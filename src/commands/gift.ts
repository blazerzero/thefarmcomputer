import { formatDate } from "../constants";
import { getVillager } from "../db";
import { InteractionResponseType, type Villager } from "../types";

const EMBED_COLOR = 0xe8608a;

const TIERS: Array<{ key: keyof Villager; label: string }> = [
  { key: "loved_gifts",    label: "❤️ Loved" },
  { key: "liked_gifts",    label: "😊 Liked" },
  { key: "neutral_gifts",  label: "😐 Neutral" },
  { key: "disliked_gifts", label: "😒 Disliked" },
  { key: "hated_gifts",    label: "😡 Hated" },
];

function formatList(items: string[]): string {
  if (!items.length) return "—";
  return items.map((s) => `• ${s}`).join("\n").slice(0, 1024);
}

export function handleGift(
  interaction: Record<string, unknown>,
  sql: SqlStorage,
): Response {
  const options = (interaction.data as Record<string, unknown>)
    ?.options as Array<{ name: string; value: string }> | undefined;
  const name = options?.find((o) => o.name === "villager")?.value ?? "";

  const villager = getVillager(sql, name);

  if (!villager) {
    return Response.json({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        content: `No villager named **${name}** found. Check the spelling (e.g. \`Abigail\`, \`Harvey\`).`,
        flags: 64,
      },
    });
  }

  const fields = TIERS.map(({ key, label }) => ({
    name: label,
    value: formatList(villager[key] as string[]),
    inline: false,
  }));

  const embed = {
    title: villager.name,
    url: villager.wiki_url,
    thumbnail: villager.image_url ? { url: villager.image_url } : undefined,
    color: EMBED_COLOR,
    description: villager.birthday ? `🎂 Birthday: **${villager.birthday}**` : undefined,
    fields,
    footer: villager.last_updated
      ? { text: `Data from Stardew Valley Wiki • Last updated ${formatDate(villager.last_updated)}` }
      : undefined,
  };

  return Response.json({
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: { embeds: [embed] },
  });
}
