"""Discord cog: /gift command."""

import discord
from discord import app_commands
from discord.ext import commands

from bot import database

EMBED_COLOUR = 0xE8608A  # Stardew pink

# Emoji prefixes for each tier
TIER_LABELS = {
    "loved_gifts":    "❤️ Loved",
    "liked_gifts":    "😊 Liked",
    "neutral_gifts":  "😐 Neutral",
    "disliked_gifts": "😒 Disliked",
    "hated_gifts":    "😡 Hated",
}

MAX_ITEMS_PER_FIELD = 20  # avoid embed field value limit (1024 chars)


def _truncate_list(items: list[str]) -> str:
    if not items:
        return "—"
    shown = items[:MAX_ITEMS_PER_FIELD]
    tail = f" (+{len(items) - MAX_ITEMS_PER_FIELD} more)" if len(items) > MAX_ITEMS_PER_FIELD else ""
    return ", ".join(shown) + tail


def _build_embed(villager: dict) -> discord.Embed:
    embed = discord.Embed(
        title=villager["name"],
        url=villager.get("wiki_url", ""),
        colour=EMBED_COLOUR,
    )

    if villager.get("birthday"):
        embed.description = f"🎂 Birthday: **{villager['birthday']}**"

    for field_key, label in TIER_LABELS.items():
        items: list[str] = villager.get(field_key, [])
        embed.add_field(name=label, value=_truncate_list(items), inline=False)

    updated = villager.get("last_updated", "")
    if updated:
        embed.set_footer(text=f"Data from Stardew Valley Wiki • Last updated {updated[:10]}")

    return embed


class GiftsCog(commands.Cog):
    def __init__(self, bot: commands.Bot) -> None:
        self.bot = bot

    @app_commands.command(
        name="gift",
        description="Look up a villager's gift preferences in Stardew Valley.",
    )
    @app_commands.describe(villager="The villager's name (e.g. Abigail, Emily, Haley)")
    async def gift(self, interaction: discord.Interaction, villager: str) -> None:
        await interaction.response.defer()

        result = database.get_villager(villager)
        if result is None:
            await interaction.followup.send(
                f"No villager named **{villager}** found in the database. "
                "Make sure the name is spelled correctly (e.g. `Abigail`, `Harvey`)."
            )
            return

        embed = _build_embed(result)
        await interaction.followup.send(embed=embed)


async def setup(bot: commands.Bot) -> None:
    await bot.add_cog(GiftsCog(bot))
