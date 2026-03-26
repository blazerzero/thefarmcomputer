import { formatDate } from "../constants";
import { getWeapon } from "../db";
import { embedResponse, getOption, notFoundResponse } from "./utils";

const WEAPON_COLOR = 0xc0392b;

export function handleWeapon(
  interaction: Record<string, unknown>,
  sql: SqlStorage,
): Response {
  const name = getOption(interaction, "name");
  const weapon = getWeapon(sql, name);

  if (!weapon) {
    return notFoundResponse(
      `No weapon named **${name}** found. Check the spelling (e.g. \`Infinity Blade\`, \`Wood Club\`, \`Elf Blade\`).`,
    );
  }

  const fields: Array<{ name: string; value: string; inline: boolean }> = [];

  fields.push({ name: "Type", value: weapon.category, inline: true });

  if (weapon.level !== null) {
    fields.push({ name: "Level", value: String(weapon.level), inline: true });
  }

  if (weapon.min_damage !== null && weapon.max_damage !== null) {
    const dmg =
      weapon.min_damage === weapon.max_damage
        ? String(weapon.min_damage)
        : `${weapon.min_damage}–${weapon.max_damage}`;
    fields.push({ name: "Damage", value: dmg, inline: true });
  }

  if (weapon.speed !== null) {
    fields.push({ name: "Speed", value: String(weapon.speed), inline: true });
  }

  if (weapon.defense !== null) {
    fields.push({ name: "Defense", value: String(weapon.defense), inline: true });
  }

  if (weapon.mining !== null) {
    fields.push({ name: "Mining", value: String(weapon.mining), inline: true });
  }

  if (weapon.crit_chance !== null) {
    fields.push({ name: "Crit. Chance", value: `${weapon.crit_chance}%`, inline: true });
  }

  if (weapon.crit_multiplier !== null) {
    fields.push({ name: "Crit. Multiplier", value: `${weapon.crit_multiplier}x`, inline: true });
  }

  if (weapon.description) {
    fields.push({ name: "Source", value: weapon.description, inline: false });
  }

  return embedResponse({
    title: weapon.name,
    url: weapon.wiki_url,
    color: WEAPON_COLOR,
    thumbnail: weapon.image_url ? { url: weapon.image_url } : undefined,
    fields,
    footer: { text: `Data from Stardew Valley Wiki • Last updated ${formatDate(weapon.last_updated)}` },
  });
}
