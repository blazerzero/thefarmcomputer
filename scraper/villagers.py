"""Scrape villager gift data from the Stardew Valley Wiki."""

import json
import logging
import re

from bs4 import BeautifulSoup

from scraper.wiki import fetch_page

logger = logging.getLogger(__name__)

VILLAGERS_PATH = "/Villagers"
WIKI_BASE = "https://stardewvalleywiki.com"

# Gift preference tiers as they appear on wiki pages
GIFT_TIERS = ["loved", "liked", "neutral", "disliked", "hated"]

# Villagers who are not gift-able (non-social NPCs) — skip them
NON_SOCIAL = {
    "Dwarf",
    "Krobus",
    "Sandy",
    "Marnie",
    "Pam",
    "Linus",
    "Willy",
    "Leo",
}


def _scrape_villager_list() -> list[tuple[str, str]]:
    """Return (name, wiki_path) pairs for each social villager."""
    html = fetch_page(VILLAGERS_PATH)
    soup = BeautifulSoup(html, "html.parser")

    villagers: list[tuple[str, str]] = []

    # The Villagers page lists NPCs in a wikitable with a "Name" column
    for table in soup.find_all("table", class_="wikitable"):
        for row in table.find_all("tr")[1:]:
            cells = row.find_all(["td", "th"])
            if not cells:
                continue
            link = cells[0].find("a", href=True)
            if link:
                name = link.get_text(strip=True)
                path = link["href"]
                if name and path.startswith("/") and name not in NON_SOCIAL:
                    villagers.append((name, path))

    # Deduplicate while preserving order
    seen: set[str] = set()
    unique: list[tuple[str, str]] = []
    for name, path in villagers:
        if name not in seen:
            seen.add(name)
            unique.append((name, path))

    logger.info("Found %d villagers on %s", len(unique), VILLAGERS_PATH)
    return unique


def _scrape_gifts(name: str, path: str) -> dict:
    """Fetch one villager's page and extract gift preferences.

    Returns a dict with keys:
        name, birthday, loved_gifts, liked_gifts, neutral_gifts,
        disliked_gifts, hated_gifts, wiki_url
    """
    html = fetch_page(path)
    soup = BeautifulSoup(html, "html.parser")
    wiki_url = WIKI_BASE + path

    # ── Birthday ──────────────────────────────────────────────────────────────
    birthday = ""
    for row in soup.find_all("tr"):
        header = row.find("th")
        if header and "birthday" in header.get_text(strip=True).lower():
            td = row.find("td")
            if td:
                birthday = td.get_text(separator=" ", strip=True)
            break

    # ── Gift preferences ───────────────────────────────────────────────────────
    gifts: dict[str, list[str]] = {tier: [] for tier in GIFT_TIERS}

    # Strategy 1: look for a wikitable under a "Gifts" heading
    gifts_heading = None
    for tag in soup.find_all(re.compile(r"^h[2-4]$")):
        if "gift" in tag.get_text(strip=True).lower():
            gifts_heading = tag
            break

    if gifts_heading:
        # Walk siblings to find the first table after the heading
        sibling = gifts_heading.find_next_sibling()
        while sibling:
            if sibling.name and sibling.name.startswith("h"):
                break  # Hit the next section
            if sibling.name == "table":
                _parse_gifts_table(sibling, gifts)
                break
            sibling = sibling.find_next_sibling()

    # Strategy 2: search for a table whose first column contains gift tier names
    if all(len(v) == 0 for v in gifts.values()):
        for table in soup.find_all("table"):
            if _parse_gifts_table(table, gifts):
                break

    return {
        "name": name,
        "birthday": birthday,
        "loved_gifts": json.dumps(gifts["loved"]),
        "liked_gifts": json.dumps(gifts["liked"]),
        "neutral_gifts": json.dumps(gifts["neutral"]),
        "disliked_gifts": json.dumps(gifts["disliked"]),
        "hated_gifts": json.dumps(gifts["hated"]),
        "wiki_url": wiki_url,
    }


def _parse_gifts_table(table, gifts: dict) -> bool:
    """Try to populate *gifts* from *table*. Returns True if any rows matched."""
    matched = False
    for row in table.find_all("tr"):
        cells = row.find_all(["td", "th"])
        if len(cells) < 2:
            continue
        tier_text = cells[0].get_text(strip=True).lower()
        for tier in GIFT_TIERS:
            if tier in tier_text:
                # All remaining cells or a single comma-separated cell
                items: list[str] = []
                for cell in cells[1:]:
                    for link in cell.find_all("a"):
                        item_name = link.get_text(strip=True)
                        if item_name:
                            items.append(item_name)
                    # Also capture plain text if no links
                    if not cell.find("a"):
                        raw = cell.get_text(separator=",", strip=True)
                        items.extend(
                            i.strip() for i in raw.split(",") if i.strip()
                        )
                if items:
                    gifts[tier] = items
                    matched = True
                break
    return matched


def scrape_villagers() -> list[dict]:
    """Scrape gift preferences for all social villagers.

    Returns:
        List of villager dicts.
    """
    villager_list = _scrape_villager_list()
    results: list[dict] = []

    for name, path in villager_list:
        try:
            data = _scrape_gifts(name, path)
            results.append(data)
            logger.debug("Scraped gifts for %s", name)
        except Exception as exc:  # noqa: BLE001
            logger.error("Failed to scrape %s: %s", name, exc)

    logger.info("Scraped gift data for %d villagers", len(results))
    return results
