CREATE TABLE IF NOT EXISTS users (
  id           TEXT PRIMARY KEY,
  email        TEXT UNIQUE,
  username     TEXT UNIQUE NOT NULL,
  display_name TEXT,
  avatar_url   TEXT,
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS oauth_accounts (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider    TEXT NOT NULL,
  provider_id TEXT NOT NULL,
  email       TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(provider, provider_id)
);

CREATE TABLE IF NOT EXISTS farms (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  emoji      TEXT,
  owner_id   TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS farm_members (
  farm_id   TEXT NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  user_id   TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role      TEXT NOT NULL DEFAULT 'member',
  joined_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (farm_id, user_id)
);

CREATE TABLE IF NOT EXISTS farm_invitations (
  id              TEXT PRIMARY KEY,
  farm_id         TEXT NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  invited_by      TEXT NOT NULL REFERENCES users(id),
  invited_user_id TEXT REFERENCES users(id),
  invited_email   TEXT,
  status          TEXT NOT NULL DEFAULT 'pending',
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at      TEXT NOT NULL,
  CHECK (invited_user_id IS NOT NULL OR invited_email IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS farm_bundle_items (
  id        TEXT PRIMARY KEY,
  farm_id   TEXT NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  user_id   TEXT NOT NULL REFERENCES users(id),
  bundle_id INTEGER NOT NULL,
  item_name TEXT NOT NULL,
  marked_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(farm_id, bundle_id, item_name)
);

CREATE INDEX IF NOT EXISTS idx_oauth_user ON oauth_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_farms_owner ON farms(owner_id);
CREATE INDEX IF NOT EXISTS idx_farm_members_user ON farm_members(user_id);
CREATE INDEX IF NOT EXISTS idx_invitations_farm ON farm_invitations(farm_id);
CREATE INDEX IF NOT EXISTS idx_invitations_user ON farm_invitations(invited_user_id);
CREATE INDEX IF NOT EXISTS idx_bundle_items_farm ON farm_bundle_items(farm_id, bundle_id);
