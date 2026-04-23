CREATE TABLE IF NOT EXISTS farm_museum_donations (
  id        TEXT    PRIMARY KEY,
  farm_id   TEXT    NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  user_id   TEXT    NOT NULL REFERENCES users(id),
  item_type TEXT    NOT NULL CHECK (item_type IN ('artifact', 'mineral')),
  item_id   INTEGER NOT NULL,
  marked_at TEXT    NOT NULL DEFAULT (datetime('now')),
  UNIQUE(farm_id, item_type, item_id)
);
CREATE INDEX IF NOT EXISTS idx_museum_donations_farm ON farm_museum_donations(farm_id, item_type);
