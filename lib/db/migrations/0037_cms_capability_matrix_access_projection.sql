-- Task 345: central topic × geography capability authority.
-- This migration creates no grants and changes no roles, market assignments,
-- editorial work, publication pointers, or enabled markets.  Existing users
-- therefore retain the compatibility projection until an administrator
-- explicitly saves matrix grants.
CREATE TABLE IF NOT EXISTS cms_user_capability_grants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES cms_users(id) ON DELETE CASCADE,
  topic text NOT NULL CHECK (topic IN (
    'person','partner','platform','publication','case-study',
    'industry','framework','office','landing-page','site-configuration'
  )),
  capability text NOT NULL CHECK (capability IN ('view','edit','review','publish')),
  scope text NOT NULL DEFAULT 'regional' CHECK (scope IN ('regional','shared')),
  market_code text NOT NULL CHECK (market_code ~ '^[a-z][a-z0-9-]{1,15}$'),
  created_by_user_id uuid REFERENCES cms_users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT cms_user_capability_grants_unique
    UNIQUE (user_id,topic,capability,scope,market_code)
);
CREATE INDEX IF NOT EXISTS cms_user_capability_grants_lookup_idx
  ON cms_user_capability_grants(user_id,capability,topic,market_code);

-- Receipts record an explicit dry run and the exact before/after authority
-- projections.  They are audit evidence only: the route never applies the
-- proposed grants from a dry run.
CREATE TABLE IF NOT EXISTS cms_capability_migration_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requested_by_user_id uuid NOT NULL REFERENCES cms_users(id) ON DELETE RESTRICT,
  target_user_id uuid REFERENCES cms_users(id) ON DELETE SET NULL,
  mode text NOT NULL DEFAULT 'dry-run' CHECK (mode = 'dry-run'),
  before_snapshot jsonb NOT NULL,
  after_snapshot jsonb NOT NULL,
  disposition text NOT NULL DEFAULT 'no-persistent-access-change',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS cms_capability_migration_receipts_target_idx
  ON cms_capability_migration_receipts(target_user_id,created_at);
CREATE INDEX IF NOT EXISTS cms_capability_migration_receipts_requester_idx
  ON cms_capability_migration_receipts(requested_by_user_id,created_at);