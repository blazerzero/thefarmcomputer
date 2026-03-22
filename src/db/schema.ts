export function initDb(sql: SqlStorage): void {
  sql.exec(`
    CREATE TABLE IF NOT EXISTS crops (
      id            INTEGER PRIMARY KEY,
      name          TEXT UNIQUE NOT NULL,
      seasons       TEXT,
      growth_days   INTEGER,
      regrowth_days INTEGER,
      sell_price         INTEGER,
      sell_price_silver  INTEGER,
      sell_price_gold    INTEGER,
      sell_price_iridium INTEGER,
      buy_price          INTEGER,
      is_trellis    INTEGER,
      image_url     TEXT,
      wiki_url      TEXT,
      last_updated  TEXT
    )
  `);
  // Add quality price columns to existing instances that predate this schema change.
  // ALTER TABLE throws if the column already exists; swallow that error.
  for (const col of ["sell_price_silver", "sell_price_gold", "sell_price_iridium", "image_url"]) {
    try { sql.exec(`ALTER TABLE crops ADD COLUMN ${col} ${col === "image_url" ? "TEXT" : "INTEGER"}`); } catch { /* already exists */ }
  }

  sql.exec(`
    CREATE TABLE IF NOT EXISTS fruit_trees (
      id                 INTEGER PRIMARY KEY,
      name               TEXT UNIQUE NOT NULL,
      season             TEXT,
      growth_days        INTEGER,
      sapling_price      INTEGER,
      fruit_name         TEXT,
      sell_price         INTEGER,
      sell_price_silver  INTEGER,
      sell_price_gold    INTEGER,
      sell_price_iridium INTEGER,
      image_url          TEXT,
      wiki_url           TEXT,
      last_updated       TEXT
    )
  `);

  sql.exec(`
    CREATE TABLE IF NOT EXISTS fish (
      id                 INTEGER PRIMARY KEY,
      name               TEXT UNIQUE NOT NULL,
      category           TEXT,
      description        TEXT,
      sell_price         INTEGER,
      sell_price_silver  INTEGER,
      sell_price_gold    INTEGER,
      sell_price_iridium INTEGER,
      location           TEXT,
      time               TEXT,
      seasons            TEXT,
      weather            TEXT,
      min_size           INTEGER,
      max_size           INTEGER,
      difficulty         INTEGER,
      behavior           TEXT,
      base_xp            INTEGER,
      image_url          TEXT,
      wiki_url           TEXT,
      last_updated       TEXT
    )
  `);

  sql.exec(`
    CREATE TABLE IF NOT EXISTS bundles (
      id             INTEGER PRIMARY KEY,
      name           TEXT UNIQUE NOT NULL,
      room           TEXT NOT NULL,
      items          TEXT NOT NULL,
      items_required INTEGER NOT NULL,
      reward         TEXT NOT NULL,
      image_url      TEXT,
      wiki_url       TEXT,
      last_updated   TEXT
    )
  `);

  sql.exec(`
    CREATE TABLE IF NOT EXISTS forageables (
      id                 INTEGER PRIMARY KEY,
      name               TEXT UNIQUE NOT NULL,
      seasons            TEXT,
      locations          TEXT,
      sell_price         INTEGER,
      sell_price_silver  INTEGER,
      sell_price_gold    INTEGER,
      sell_price_iridium INTEGER,
      energy             INTEGER,
      health             INTEGER,
      used_in            TEXT,
      image_url          TEXT,
      wiki_url           TEXT,
      last_updated       TEXT
    )
  `);

  sql.exec(`
    CREATE TABLE IF NOT EXISTS minerals (
      id                    INTEGER PRIMARY KEY,
      name                  TEXT UNIQUE NOT NULL,
      category              TEXT,
      description           TEXT,
      sell_price            INTEGER,
      sell_price_gemologist INTEGER,
      source                TEXT,
      used_in               TEXT,
      image_url             TEXT,
      wiki_url              TEXT,
      last_updated          TEXT
    )
  `);

  sql.exec(`
    CREATE TABLE IF NOT EXISTS crafted_items (
      id               INTEGER PRIMARY KEY,
      name             TEXT UNIQUE NOT NULL,
      description      TEXT,
      duration_days    INTEGER,
      duration_seasons TEXT,
      radius           REAL,
      ingredients      TEXT,
      energy           INTEGER,
      health           INTEGER,
      recipe_source    TEXT,
      image_url        TEXT,
      wiki_url         TEXT,
      last_updated     TEXT
    )
  `);

  sql.exec(`
    CREATE TABLE IF NOT EXISTS villagers (
      id             INTEGER PRIMARY KEY,
      name           TEXT UNIQUE NOT NULL,
      birthday       TEXT,
      loved_gifts    TEXT,
      liked_gifts    TEXT,
      neutral_gifts  TEXT,
      disliked_gifts TEXT,
      hated_gifts    TEXT,
      schedule       TEXT,
      wiki_url       TEXT,
      image_url      TEXT,
      last_updated   TEXT
    )
  `);
  // Add schedule column to existing instances that predate this schema change.
  try { sql.exec("ALTER TABLE villagers ADD COLUMN schedule TEXT"); } catch { /* already exists */ }

  sql.exec(`
    CREATE TABLE IF NOT EXISTS monsters (
      id           INTEGER PRIMARY KEY,
      name         TEXT UNIQUE NOT NULL,
      location     TEXT,
      hp           TEXT,
      damage       TEXT,
      defense      TEXT,
      speed        TEXT,
      xp           TEXT,
      drops        TEXT,
      image_url    TEXT,
      wiki_url     TEXT,
      last_updated TEXT
    )
  `);
}
