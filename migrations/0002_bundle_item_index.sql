-- Replace item_name (TEXT) with item_index (INTEGER) so duplicate-named items
-- within a bundle are tracked correctly by position, not by name.
DROP TABLE IF EXISTS farm_bundle_items;

CREATE TABLE farm_bundle_items (
  id         TEXT    PRIMARY KEY,
  farm_id    TEXT    NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  user_id    TEXT    NOT NULL REFERENCES users(id),
  bundle_id  INTEGER NOT NULL,
  item_index INTEGER NOT NULL,
  marked_at  TEXT    NOT NULL DEFAULT (datetime('now')),
  UNIQUE(farm_id, bundle_id, item_index)
);

CREATE INDEX IF NOT EXISTS idx_bundle_items_farm ON farm_bundle_items(farm_id, bundle_id);
