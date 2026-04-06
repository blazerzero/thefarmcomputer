export function initDb(sql: SqlStorage): void {
	sql.exec(`
    CREATE TABLE IF NOT EXISTS crops (
      id            INTEGER PRIMARY KEY,
      name          TEXT UNIQUE NOT NULL,
      description   TEXT,
      seasons       TEXT,
      growth_days   INTEGER,
      regrowth_days INTEGER,
      sell_price         INTEGER,
      sell_price_silver  INTEGER,
      sell_price_gold    INTEGER,
      sell_price_iridium INTEGER,
      buy_price          INTEGER,
      is_trellis    INTEGER,
      energy         INTEGER,
      energy_silver  INTEGER,
      energy_gold    INTEGER,
      energy_iridium INTEGER,
      health         INTEGER,
      health_silver  INTEGER,
      health_gold    INTEGER,
      health_iridium INTEGER,
      used_in       TEXT,
      image_url     TEXT,
      wiki_url      TEXT,
      last_updated  TEXT
    )
  `);
	// Add quality price columns to existing instances that predate this schema change.
	// ALTER TABLE throws if the column already exists; swallow that error.
	for (const col of [
		"sell_price_silver",
		"sell_price_gold",
		"sell_price_iridium",
		"image_url",
	]) {
		try {
			sql.exec(
				`ALTER TABLE crops ADD COLUMN ${col} ${col === "image_url" ? "TEXT" : "INTEGER"}`,
			);
		} catch {
			/* already exists */
		}
	}
	try {
		sql.exec("ALTER TABLE crops ADD COLUMN description TEXT");
	} catch {
		/* already exists */
	}
	for (const [col, type] of [
		["energy", "INTEGER"],
		["energy_silver", "INTEGER"],
		["energy_gold", "INTEGER"],
		["energy_iridium", "INTEGER"],
		["health", "INTEGER"],
		["health_silver", "INTEGER"],
		["health_gold", "INTEGER"],
		["health_iridium", "INTEGER"],
		["used_in", "TEXT"],
	] as [string, string][]) {
		try {
			sql.exec(`ALTER TABLE crops ADD COLUMN ${col} ${type}`);
		} catch {
			/* already exists */
		}
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
    CREATE TABLE IF NOT EXISTS fruits (
      id                 INTEGER PRIMARY KEY,
      name               TEXT UNIQUE NOT NULL,
      source             TEXT,
      seasons            TEXT,
      sell_price         INTEGER,
      sell_price_silver  INTEGER,
      sell_price_gold    INTEGER,
      sell_price_iridium INTEGER,
      energy             INTEGER,
      energy_silver      INTEGER,
      energy_gold        INTEGER,
      energy_iridium     INTEGER,
      health             INTEGER,
      health_silver      INTEGER,
      health_gold        INTEGER,
      health_iridium     INTEGER,
      tiller_boost         INTEGER NOT NULL DEFAULT 0,
      bears_knowledge_boost INTEGER NOT NULL DEFAULT 0,
      artisan_prices       TEXT NOT NULL DEFAULT '{}',
      image_url            TEXT,
      wiki_url             TEXT,
      last_updated         TEXT
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

	// Add quality-tier energy/health columns to existing forageable instances.
	for (const col of [
		"energy_silver",
		"energy_gold",
		"energy_iridium",
		"health_silver",
		"health_gold",
		"health_iridium",
	]) {
		try {
			sql.exec(`ALTER TABLE forageables ADD COLUMN ${col} INTEGER`);
		} catch {
			/* already exists */
		}
	}

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
	try {
		sql.exec("ALTER TABLE villagers ADD COLUMN schedule TEXT");
	} catch {
		/* already exists */
	}

	sql.exec(`
    CREATE TABLE IF NOT EXISTS books (
      id                 INTEGER PRIMARY KEY,
      name               TEXT UNIQUE NOT NULL,
      description        TEXT,
      subsequent_reading TEXT,
      location           TEXT,
      image_url          TEXT,
      wiki_url           TEXT,
      last_updated       TEXT
    )
  `);

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

	sql.exec(`
    CREATE TABLE IF NOT EXISTS recipes (
      id             INTEGER PRIMARY KEY,
      name           TEXT UNIQUE NOT NULL,
      description    TEXT,
      ingredients    TEXT,
      energy         INTEGER,
      health         INTEGER,
      buffs          TEXT,
      buff_duration  TEXT,
      recipe_source  TEXT,
      sell_price     INTEGER,
      image_url      TEXT,
      wiki_url       TEXT,
      last_updated   TEXT
    )
  `);

	sql.exec(`
    CREATE TABLE IF NOT EXISTS weapons (
      id              INTEGER PRIMARY KEY,
      name            TEXT UNIQUE NOT NULL,
      category        TEXT,
      min_damage      INTEGER,
      max_damage      INTEGER,
      speed           INTEGER,
      defense         INTEGER,
      weight          REAL,
      crit_chance     REAL,
      crit_power      REAL,
      level           INTEGER,
      sell_price      INTEGER,
      purchase_price  INTEGER,
      location        TEXT,
      description     TEXT,
      extra_stats     TEXT,
      image_url       TEXT,
      wiki_url        TEXT,
      last_updated    TEXT
    )
  `);
	try {
		sql.exec("ALTER TABLE weapons ADD COLUMN extra_stats TEXT");
	} catch {
		/* already exists */
	}
	try {
		sql.exec("ALTER TABLE weapons ADD COLUMN sell_price INTEGER");
	} catch {
		/* already exists */
	}
	try {
		sql.exec("ALTER TABLE weapons ADD COLUMN purchase_price INTEGER");
	} catch {
		/* already exists */
	}
	try {
		sql.exec("ALTER TABLE weapons ADD COLUMN location TEXT");
	} catch {
		/* already exists */
	}

	sql.exec(`
    CREATE TABLE IF NOT EXISTS footwear (
      id           		INTEGER PRIMARY KEY,
      name         		TEXT UNIQUE NOT NULL,
      stats        		TEXT,
      description  		TEXT,
      purchase_price 	INTEGER,
      sell_price   		INTEGER,
      source       		TEXT,
      image_url    		TEXT,
      wiki_url     		TEXT,
      last_updated 		TEXT
    )
  `);

	sql.exec(`
    CREATE TABLE IF NOT EXISTS rings (
      id            INTEGER PRIMARY KEY,
      name          TEXT UNIQUE NOT NULL,
      description   TEXT,
      sell_price    INTEGER,
      effects       TEXT,
      where_to_find TEXT,
      image_url     TEXT,
      wiki_url      TEXT,
      last_updated  TEXT
    )
  `);

	sql.exec(`
    CREATE TABLE IF NOT EXISTS deconstruct_items (
      id                  INTEGER PRIMARY KEY,
      name                TEXT UNIQUE NOT NULL,
      sell_price          INTEGER,
      deconstructed_items TEXT,
      image_url           TEXT,
      wiki_url            TEXT,
      last_updated        TEXT
    )
  `);

	sql.exec(`
    CREATE TABLE IF NOT EXISTS artisan_goods (
      id                   INTEGER PRIMARY KEY,
      name                 TEXT UNIQUE NOT NULL,
      machine              TEXT,
      description          TEXT,
      ingredients          TEXT,
      processing_time      TEXT,
      sell_price           TEXT,
      energy               TEXT,
      health               TEXT,
      buffs                TEXT,
      cask_days_to_silver  INTEGER,
      cask_days_to_gold    INTEGER,
      cask_days_to_iridium INTEGER,
      image_url            TEXT,
      wiki_url             TEXT,
      last_updated         TEXT
    )
  `);
}
