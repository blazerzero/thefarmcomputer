import { formatDate } from "../constants";
import { getMonster } from "../db";
import { embedResponse, getOption, notFoundResponse, renderDotList } from "./utils";

const MONSTER_COLOR = 0xc0392b;

export function handleMonster(
  interaction: Record<string, unknown>,
  sql: SqlStorage,
): Response {
  const name = getOption(interaction, "name");
  const monster = getMonster(sql, name);

  if (!monster) {
    return notFoundResponse(
      `No monster named **${name}** found. Check the spelling (e.g. \`Shadow Brute\`, \`Frost Bat\`, \`Green Slime\`).`,
    );
  }

  const fields: Array<{ name: string; value: string; inline: boolean }> = [];

  // Stats row (inline)
  if (monster.hp !== null) {
    fields.push({ name: "HP", value: monster.hp, inline: true });
  }
  if (monster.damage !== null) {
    fields.push({ name: "Damage", value: monster.damage, inline: true });
  }
  if (monster.defense !== null) {
    fields.push({ name: "Defense", value: monster.defense, inline: true });
  }
  if (monster.speed !== null) {
    fields.push({ name: "Speed", value: monster.speed, inline: true });
  }
  if (monster.xp !== null) {
    fields.push({ name: "XP", value: monster.xp, inline: true });
  }

  if (monster.location) {
    fields.push({ name: "Location", value: monster.location, inline: false });
  }

  if (monster.drops.length > 0) {
    fields.push({
      name: "Drops",
      value: renderDotList(monster.drops),
      inline: false,
    });
  }

  return embedResponse({
    title: monster.name,
    url: monster.wiki_url,
    color: MONSTER_COLOR,
    thumbnail: monster.image_url ? { url: monster.image_url } : undefined,
    fields,
    footer: { text: `Data from Stardew Valley Wiki • Last updated ${formatDate(monster.last_updated)}` },
  });
}
