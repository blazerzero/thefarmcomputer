CREATE TABLE IF NOT EXISTS crops (
    id            INTEGER PRIMARY KEY,
    name          TEXT UNIQUE NOT NULL,
    seasons       TEXT,           -- JSON array, e.g. '["Spring","Summer"]'
    growth_days   INTEGER,
    regrowth_days INTEGER,        -- NULL for single-harvest crops
    sell_price    INTEGER,
    buy_price     INTEGER,
    is_trellis    INTEGER,        -- 0 or 1
    wiki_url      TEXT,
    last_updated  TEXT            -- ISO 8601 timestamp
);

CREATE TABLE IF NOT EXISTS villagers (
    id             INTEGER PRIMARY KEY,
    name           TEXT UNIQUE NOT NULL,
    birthday       TEXT,          -- e.g. "Fall 13"
    loved_gifts    TEXT,          -- JSON array of item names
    liked_gifts    TEXT,
    neutral_gifts  TEXT,
    disliked_gifts TEXT,
    hated_gifts    TEXT,
    wiki_url       TEXT,
    last_updated   TEXT
);
