"""Low-level HTTP helpers for fetching Stardew Valley Wiki pages."""

import time
import logging
import requests

logger = logging.getLogger(__name__)

BASE_URL = "https://stardewvalleywiki.com"
HEADERS = {
    "User-Agent": (
        "StardewBot/1.0 (Discord lookup bot; "
        "github.com/blazerzero/thefarmcomputer)"
    )
}
_RETRY_DELAYS = (2, 4, 8)  # seconds between attempts


def fetch_page(path: str) -> str:
    """Fetch a wiki page and return its HTML.

    Args:
        path: Relative path, e.g. "/Crops" or "/Abigail".

    Returns:
        HTML string of the page.

    Raises:
        RuntimeError: if all retry attempts fail.
    """
    url = BASE_URL + path
    last_exc: Exception | None = None

    for attempt, delay in enumerate((_RETRY_DELAYS[0], *_RETRY_DELAYS), start=1):
        try:
            resp = requests.get(url, headers=HEADERS, timeout=15)
            resp.raise_for_status()
            return resp.text
        except requests.RequestException as exc:
            last_exc = exc
            if attempt <= len(_RETRY_DELAYS):
                logger.warning(
                    "Fetch %s failed (attempt %d): %s — retrying in %ds",
                    url,
                    attempt,
                    exc,
                    delay,
                )
                time.sleep(delay)
            else:
                break

    raise RuntimeError(f"Failed to fetch {url} after retries: {last_exc}") from last_exc
