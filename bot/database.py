"""SQLite database helpers for the Stardew Valley bot."""

import json
import logging
import os
import sqlite3
from datetime import datetime, timezone

import config

logger = logging.getLogger(__name__)


def _connect() -> sqlite3.Connection:
    os.makedirs(os.path.dirname(config.DB_PATH), exist_ok=True)
    conn = sqlite3.connect(config.DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    """Create tables if they do not already exist."""
    with _connect() as conn:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS crops (
                id            INTEGER PRIMARY KEY,
                name          TEXT UNIQUE NOT NULL,
                seasons       TEXT,
                growth_days   INTEGER,
                regrowth_days INTEGER,
                sell_price    INTEGER,
                buy_price     INTEGER,
                is_trellis    INTEGER,
                wiki_url      TEXT,
                last_updated  TEXT
            );

            CREATE TABLE IF NOT EXISTS villagers (
                id             INTEGER PRIMARY KEY,
                name           TEXT UNIQUE NOT NULL,
                birthday       TEXT,
                loved_gifts    TEXT,
                liked_gifts    TEXT,
                neutral_gifts  TEXT,
                disliked_gifts TEXT,
                hated_gifts    TEXT,
                wiki_url       TEXT,
                last_updated   TEXT
            );
            """
        )
    logger.debug("Database initialised at %s", config.DB_PATH)


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


# ── Upsert helpers ────────────────────────────────────────────────────────────

def upsert_crop(data: dict) -> None:
    with _connect() as conn:
        conn.execute(
            """
            INSERT INTO crops
                (name, seasons, growth_days, regrowth_days, sell_price,
                 buy_price, is_trellis, wiki_url, last_updated)
            VALUES
                (:name, :seasons, :growth_days, :regrowth_days, :sell_price,
                 :buy_price, :is_trellis, :wiki_url, :last_updated)
            ON CONFLICT(name) DO UPDATE SET
                seasons       = excluded.seasons,
                growth_days   = excluded.growth_days,
                regrowth_days = excluded.regrowth_days,
                sell_price    = excluded.sell_price,
                buy_price     = excluded.buy_price,
                is_trellis    = excluded.is_trellis,
                wiki_url      = excluded.wiki_url,
                last_updated  = excluded.last_updated
            """,
            {**data, "last_updated": _now()},
        )


def upsert_villager(data: dict) -> None:
    with _connect() as conn:
        conn.execute(
            """
            INSERT INTO villagers
                (name, birthday, loved_gifts, liked_gifts, neutral_gifts,
                 disliked_gifts, hated_gifts, wiki_url, last_updated)
            VALUES
                (:name, :birthday, :loved_gifts, :liked_gifts, :neutral_gifts,
                 :disliked_gifts, :hated_gifts, :wiki_url, :last_updated)
            ON CONFLICT(name) DO UPDATE SET
                birthday       = excluded.birthday,
                loved_gifts    = excluded.loved_gifts,
                liked_gifts    = excluded.liked_gifts,
                neutral_gifts  = excluded.neutral_gifts,
                disliked_gifts = excluded.disliked_gifts,
                hated_gifts    = excluded.hated_gifts,
                wiki_url       = excluded.wiki_url,
                last_updated   = excluded.last_updated
            """,
            {**data, "last_updated": _now()},
        )


# ── Query helpers ─────────────────────────────────────────────────────────────

def get_crop(name: str) -> dict | None:
    """Return a crop dict (with seasons decoded to list) or None."""
    with _connect() as conn:
        row = conn.execute(
            "SELECT * FROM crops WHERE name LIKE ? LIMIT 1",
            (f"%{name}%",),
        ).fetchone()
    if row is None:
        return None
    result = dict(row)
    result["seasons"] = json.loads(result["seasons"] or "[]")
    return result


def get_villager(name: str) -> dict | None:
    """Return a villager dict (with gift lists decoded) or None."""
    with _connect() as conn:
        row = conn.execute(
            "SELECT * FROM villagers WHERE name LIKE ? LIMIT 1",
            (f"%{name}%",),
        ).fetchone()
    if row is None:
        return None
    result = dict(row)
    for field in ("loved_gifts", "liked_gifts", "neutral_gifts", "disliked_gifts", "hated_gifts"):
        result[field] = json.loads(result[field] or "[]")
    return result


def count_crops() -> int:
    with _connect() as conn:
        return conn.execute("SELECT COUNT(*) FROM crops").fetchone()[0]


def count_villagers() -> int:
    with _connect() as conn:
        return conn.execute("SELECT COUNT(*) FROM villagers").fetchone()[0]


if __name__ == "__main__":
    # Quick smoke test
    logging.basicConfig(level=logging.DEBUG)
    init_db()
    test_crop = {
        "name": "TestParsnip",
        "seasons": '["Spring"]',
        "growth_days": 4,
        "regrowth_days": None,
        "sell_price": 35,
        "buy_price": 20,
        "is_trellis": 0,
        "wiki_url": "https://stardewvalleywiki.com/Parsnip",
    }
    upsert_crop(test_crop)
    result = get_crop("TestParsnip")
    print("Crop lookup:", result)
    assert result is not None and result["name"] == "TestParsnip"
    print("Smoke test passed.")
