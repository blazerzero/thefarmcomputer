import { getVillager } from "../db";
import { InteractionResponseType, type Villager } from "../types";

const EMBED_COLOR = 0xe8608a;
const MAX_ITEMS = 20;

const TIERS: Array<{ key: keyof Villager; label: string }> = [
  { key: "loved_gifts",    label: "❤️ Loved" },
  { key: "liked_gifts",    label: "😊 Liked" },
  { key: "neutral_gifts",  label: "😐 Neutral" },
  { key: "disliked_gifts", label: "😒 Disliked" },
  { key: "hated_gifts",    label: "😡 Hated" },
];

function formatList(items: string[]): string {
  if (!items.length) return "—";
  const shown = items.slice(0, MAX_ITEMS);
  const extra = items.length > MAX_ITEMS ? ` (+${items.length - MAX_ITEMS} more)` : "";
  return shown.join(", ") + extra;
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
    color: EMBED_COLOR,
    description: villager.birthday ? `🎂 Birthday: **${villager.birthday}**` : undefined,
    fields,
    footer: villager.last_updated
      ? { text: `Data from Stardew Valley Wiki • Last updated ${villager.last_updated.slice(0, 10)}` }
      : undefined,
  };

  return Response.json({
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: { embeds: [embed] },
  });
}
