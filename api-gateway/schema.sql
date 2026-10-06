-- Formatho API Gateway — D1 schema (Phase C, plans/PAID-API-TIER-PLAN.md §3)
-- Raw keys are NEVER stored: only hex(SHA-256(raw)).

CREATE TABLE IF NOT EXISTS accounts (
  id TEXT PRIMARY KEY,             -- nanoid-style random
  email TEXT NOT NULL UNIQUE,
  stripe_customer_id TEXT,         -- nullable until billing wired (owner gate)
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS keys (
  id TEXT PRIMARY KEY,             -- public key id, safe in logs (e.g. k_<12 chars>)
  account_id TEXT NOT NULL REFERENCES accounts(id),
  key_hash TEXT NOT NULL UNIQUE,   -- hex(SHA-256(raw key))
  label TEXT,
  tier TEXT NOT NULL DEFAULT 'free' CHECK (tier IN ('free','paid')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','revoked')),
  created_at INTEGER NOT NULL,
  revoked_at INTEGER
);
CREATE INDEX IF NOT EXISTS idx_keys_hash ON keys(key_hash);  -- 1 point read per request

CREATE TABLE IF NOT EXISTS usage_daily (    -- rollups, not per-request writes
  day TEXT NOT NULL,                          -- YYYY-MM-DD (UTC)
  key_id TEXT NOT NULL,                       -- key id or 'anon'
  route TEXT NOT NULL,
  requests INTEGER NOT NULL,
  PRIMARY KEY (day, key_id, route)
);
