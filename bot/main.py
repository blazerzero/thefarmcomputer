"""Entry point for the Stardew Valley Discord bot."""

import asyncio
import logging
import sys

import discord
from discord.ext import commands

import config
from bot import database
from scheduler.updater import build_scheduler, _refresh_wiki

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger(__name__)

COGS = [
    "bot.cogs.crops",
    "bot.cogs.gifts",
    "bot.cogs.admin",
]


class StardewBot(commands.Bot):
    def __init__(self) -> None:
        intents = discord.Intents.default()
        super().__init__(command_prefix="!", intents=intents)
        self.scheduler = build_scheduler()

    async def setup_hook(self) -> None:
        # Load cogs
        for cog in COGS:
            await self.load_extension(cog)
            logger.info("Loaded cog: %s", cog)

        # Sync slash commands
        if config.GUILD_ID:
            guild = discord.Object(id=config.GUILD_ID)
            self.tree.copy_global_to(guild=guild)
            await self.tree.sync(guild=guild)
            logger.info("Slash commands synced to guild %d", config.GUILD_ID)
        else:
            await self.tree.sync()
            logger.info("Slash commands synced globally")

        # Seed DB on first run
        if database.count_crops() == 0 and database.count_villagers() == 0:
            logger.info("Database is empty — running initial wiki refresh…")
            loop = asyncio.get_event_loop()
            await loop.run_in_executor(None, _refresh_wiki)

        # Start the periodic scheduler
        self.scheduler.start()
        logger.info(
            "Wiki refresh scheduled every %.1f hours", config.UPDATE_INTERVAL_HOURS
        )

    async def on_ready(self) -> None:
        logger.info("Logged in as %s (id=%d)", self.user, self.user.id)  # type: ignore[union-attr]

    async def close(self) -> None:
        self.scheduler.shutdown(wait=False)
        await super().close()


def main() -> None:
    database.init_db()
    bot = StardewBot()
    bot.run(config.DISCORD_TOKEN, log_handler=None)


if __name__ == "__main__":
    main()
