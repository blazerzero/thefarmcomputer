"""Discord cog: /update command (admin only)."""

import asyncio
import logging

import discord
from discord import app_commands
from discord.ext import commands

import config
from bot import database
from scraper.crops import scrape_crops
from scraper.villagers import scrape_villagers

logger = logging.getLogger(__name__)


def _is_admin(interaction: discord.Interaction) -> bool:
    """Return True if the invoking user may run /update."""
    member = interaction.user
    if not isinstance(member, discord.Member):
        # DMs — deny
        return False
    if member.guild_permissions.administrator:
        return True
    if config.ADMIN_ROLE_ID:
        return any(role.id == config.ADMIN_ROLE_ID for role in member.roles)
    return False


def _run_update() -> tuple[int, int]:
    """Scrape wiki data and persist to DB. Returns (crop_count, villager_count)."""
    crops = scrape_crops()
    for crop in crops:
        database.upsert_crop(crop)

    villagers = scrape_villagers()
    for villager in villagers:
        database.upsert_villager(villager)

    return len(crops), len(villagers)


class AdminCog(commands.Cog):
    def __init__(self, bot: commands.Bot) -> None:
        self.bot = bot

    @app_commands.command(
        name="update",
        description="[Admin] Manually refresh the wiki knowledge base.",
    )
    async def update(self, interaction: discord.Interaction) -> None:
        if not _is_admin(interaction):
            await interaction.response.send_message(
                "You need the **Administrator** permission to use this command.",
                ephemeral=True,
            )
            return

        await interaction.response.send_message(
            "Refreshing data from the Stardew Valley Wiki… this may take a minute.",
            ephemeral=True,
        )

        loop = asyncio.get_event_loop()
        try:
            crop_count, villager_count = await loop.run_in_executor(None, _run_update)
        except Exception as exc:
            logger.exception("Wiki update failed")
            await interaction.followup.send(
                f"Update failed: `{exc}`\nCheck the bot logs for details.",
                ephemeral=True,
            )
            return

        await interaction.followup.send(
            f"Update complete! Loaded **{crop_count}** crops and **{villager_count}** villagers.",
            ephemeral=True,
        )


async def setup(bot: commands.Bot) -> None:
    await bot.add_cog(AdminCog(bot))
