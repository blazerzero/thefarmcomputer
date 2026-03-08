"""Discord cog: /crop command."""

import discord
from discord import app_commands
from discord.ext import commands

from bot import database

# Season colour mapping
SEASON_COLOURS = {
    "Spring": 0x78B84A,
    "Summer": 0xE8C13A,
    "Fall":   0xD2691E,
    "Winter": 0x89CFF0,
}
DEFAULT_COLOUR = 0x5B8A3C  # Stardew green


def _season_colour(seasons: list[str]) -> int:
    for s in seasons:
        if s in SEASON_COLOURS:
            return SEASON_COLOURS[s]
    return DEFAULT_COLOUR


def _build_embed(crop: dict) -> discord.Embed:
    seasons = crop["seasons"]
    colour = _season_colour(seasons)

    embed = discord.Embed(
        title=crop["name"],
        url=crop.get("wiki_url", ""),
        colour=colour,
    )

    embed.add_field(
        name="Seasons",
        value=", ".join(seasons) if seasons else "—",
        inline=True,
    )
    embed.add_field(
        name="Growth Time",
        value=f"{crop['growth_days']} days" if crop["growth_days"] else "—",
        inline=True,
    )

    regrow = crop.get("regrowth_days")
    embed.add_field(
        name="Regrowth",
        value=f"{regrow} days" if regrow else "Single harvest",
        inline=True,
    )
    embed.add_field(
        name="Buy Price",
        value=f"{crop['buy_price']:,}g" if crop["buy_price"] else "—",
        inline=True,
    )
    embed.add_field(
        name="Sell Price",
        value=f"{crop['sell_price']:,}g" if crop["sell_price"] else "—",
        inline=True,
    )
    embed.add_field(
        name="Trellis",
        value="Yes" if crop["is_trellis"] else "No",
        inline=True,
    )

    updated = crop.get("last_updated", "")
    if updated:
        embed.set_footer(text=f"Data from Stardew Valley Wiki • Last updated {updated[:10]}")

    return embed


class CropsCog(commands.Cog):
    def __init__(self, bot: commands.Bot) -> None:
        self.bot = bot

    @app_commands.command(name="crop", description="Look up info about a Stardew Valley crop.")
    @app_commands.describe(name="The crop name (e.g. Parsnip, Blueberry, Pumpkin)")
    async def crop(self, interaction: discord.Interaction, name: str) -> None:
        await interaction.response.defer()

        result = database.get_crop(name)
        if result is None:
            await interaction.followup.send(
                f"No crop named **{name}** found in the database. "
                "Make sure the name is spelled correctly (e.g. `Parsnip`, `Blueberry`)."
            )
            return

        embed = _build_embed(result)
        await interaction.followup.send(embed=embed)


async def setup(bot: commands.Bot) -> None:
    await bot.add_cog(CropsCog(bot))
