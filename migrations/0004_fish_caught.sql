CREATE TABLE IF NOT EXISTS farm_fish_caught (
  id        TEXT    PRIMARY KEY,
  farm_id   TEXT    NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  user_id   TEXT    NOT NULL REFERENCES users(id),
  fish_id   INTEGER NOT NULL,
  marked_at TEXT    NOT NULL DEFAULT (datetime('now')),
  UNIQUE(farm_id, user_id, fish_id)
);
CREATE INDEX IF NOT EXISTS idx_fish_caught_farm ON farm_fish_caught(farm_id);
