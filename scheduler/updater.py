"""APScheduler job that periodically refreshes wiki data."""

import logging

from apscheduler.schedulers.asyncio import AsyncIOScheduler

import config
from bot import database
from scraper.crops import scrape_crops
from scraper.villagers import scrape_villagers

logger = logging.getLogger(__name__)


def _refresh_wiki() -> None:
    """Synchronous scrape + persist; runs inside the scheduler thread pool."""
    logger.info("Scheduled wiki refresh starting…")
    try:
        crops = scrape_crops()
        for crop in crops:
            database.upsert_crop(crop)
        logger.info("Updated %d crops", len(crops))
    except Exception:
        logger.exception("Crop scrape failed during scheduled refresh")

    try:
        villagers = scrape_villagers()
        for villager in villagers:
            database.upsert_villager(villager)
        logger.info("Updated %d villagers", len(villagers))
    except Exception:
        logger.exception("Villager scrape failed during scheduled refresh")

    logger.info("Scheduled wiki refresh complete")


def build_scheduler() -> AsyncIOScheduler:
    """Create and configure the APScheduler instance (not yet started)."""
    scheduler = AsyncIOScheduler()
    scheduler.add_job(
        _refresh_wiki,
        trigger="interval",
        hours=config.UPDATE_INTERVAL_HOURS,
        id="wiki_refresh",
        max_instances=1,
        coalesce=True,
    )
    return scheduler
