"""Scrape crop data from the Stardew Valley Wiki /Crops page."""

import json
import logging
import re

from bs4 import BeautifulSoup

from scraper.wiki import fetch_page

logger = logging.getLogger(__name__)

CROPS_PATH = "/Crops"
WIKI_BASE = "https://stardewvalleywiki.com"


def _parse_int(text: str) -> int | None:
    """Extract the first integer from a string, or return None."""
    m = re.search(r"\d+", text.replace(",", ""))
    return int(m.group()) if m else None


def _parse_seasons(text: str) -> list[str]:
    """Return a list of season names found in *text*."""
    seasons = []
    for season in ("Spring", "Summer", "Fall", "Winter"):
        if season.lower() in text.lower():
            seasons.append(season)
    return seasons


def scrape_crops() -> list[dict]:
    """Fetch and parse the Crops wiki page.

    Returns:
        List of dicts with keys:
            name, seasons, growth_days, regrowth_days,
            sell_price, buy_price, is_trellis, wiki_url
    """
    html = fetch_page(CROPS_PATH)
    soup = BeautifulSoup(html, "html.parser")

    # The crops page has multiple wikitables; we want the main crop table.
    # It always has a header row containing "Seed" and "Growth".
    target_table = None
    for table in soup.find_all("table", class_="wikitable"):
        headers = [th.get_text(strip=True) for th in table.find_all("th")]
        header_text = " ".join(headers).lower()
        if "growth" in header_text and "seed" in header_text:
            target_table = table
            break

    if target_table is None:
        logger.error("Could not locate the crops table on %s", CROPS_PATH)
        return []

    crops: list[dict] = []

    # Build column index map from the header row
    header_row = target_table.find("tr")
    if header_row is None:
        return []
    col_names = [th.get_text(separator=" ", strip=True) for th in header_row.find_all("th")]
    logger.debug("Crop table columns: %s", col_names)

    def col_index(keyword: str) -> int | None:
        """Find the first column index whose header contains *keyword*."""
        kw = keyword.lower()
        for i, name in enumerate(col_names):
            if kw in name.lower():
                return i
        return None

    idx_name = col_index("crop") if col_index("crop") is not None else 0
    idx_seasons = col_index("season")
    idx_growth = col_index("growth")
    idx_regrowth = col_index("re-grow") or col_index("regrow")
    idx_sell = col_index("sell")
    idx_buy = col_index("seed price") or col_index("buy") or col_index("seed")
    idx_trellis = col_index("trellis")

    for row in target_table.find_all("tr")[1:]:
        cells = row.find_all(["td", "th"])
        if len(cells) < 3:
            continue

        def cell_text(idx: int | None) -> str:
            if idx is None or idx >= len(cells):
                return ""
            return cells[idx].get_text(separator=" ", strip=True)

        name_cell = cells[idx_name] if idx_name is not None and idx_name < len(cells) else cells[0]
        name = name_cell.get_text(separator=" ", strip=True)
        if not name:
            continue

        # Resolve wiki link for the crop
        link_tag = name_cell.find("a", href=True)
        wiki_url = (WIKI_BASE + link_tag["href"]) if link_tag else (WIKI_BASE + "/Crops")

        seasons_text = cell_text(idx_seasons)
        seasons = _parse_seasons(seasons_text)

        growth_text = cell_text(idx_growth)
        growth_days = _parse_int(growth_text)

        regrowth_text = cell_text(idx_regrowth) if idx_regrowth is not None else ""
        # "N/A", "—", "-" all mean no regrowth
        regrowth_days = _parse_int(regrowth_text) if re.search(r"\d", regrowth_text) else None

        sell_text = cell_text(idx_sell)
        sell_price = _parse_int(sell_text)

        buy_text = cell_text(idx_buy)
        buy_price = _parse_int(buy_text)

        trellis_text = cell_text(idx_trellis).lower()
        is_trellis = int("yes" in trellis_text or "✓" in trellis_text)

        crops.append(
            {
                "name": name,
                "seasons": json.dumps(seasons),
                "growth_days": growth_days,
                "regrowth_days": regrowth_days,
                "sell_price": sell_price,
                "buy_price": buy_price,
                "is_trellis": is_trellis,
                "wiki_url": wiki_url,
            }
        )

    logger.info("Scraped %d crops", len(crops))
    return crops
