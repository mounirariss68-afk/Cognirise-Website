-- Atomic market/locale release contracts. Receipts and candidates are immutable
-- evidence; active pointers may move only to an existing receipt.
ALTER TABLE cms_users ADD COLUMN IF NOT EXISTS account_type text NOT NULL DEFAULT 'internal';
ALTER TABLE cms_users DROP CONSTRAINT IF EXISTS cms_users_account_type_check;
ALTER TABLE cms_users ADD CONSTRAINT cms_users_account_type_check
  CHECK (account_type IN ('internal','external-representative'));

CREATE TABLE IF NOT EXISTS cms_resource_grants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES cms_users(id) ON DELETE cascade,
  resource_type text NOT NULL CHECK (resource_type IN ('canonical-page','partner-case-studies')),
  resource_id text NOT NULL,
  owner_id uuid,
  market text NOT NULL,
  locale text NOT NULL,
  actions text[] NOT NULL,
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  expires_at timestamptz,
  revoked_at timestamptz,
  created_by_user_id uuid NOT NULL REFERENCES cms_users(id) ON DELETE restrict,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id,resource_type,resource_id,market,locale,version)
);
CREATE INDEX IF NOT EXISTS cms_resource_grants_lookup_idx
  ON cms_resource_grants(user_id,resource_type,resource_id,market,locale,version);

CREATE TABLE IF NOT EXISTS cms_partner_ownership (
  document_id uuid PRIMARY KEY REFERENCES cms_documents(id) ON DELETE restrict,
  partner_document_id uuid NOT NULL REFERENCES cms_documents(id) ON DELETE restrict,
  assigned_by_user_id uuid NOT NULL REFERENCES cms_users(id) ON DELETE restrict,
  assigned_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cms_logical_media_placements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  placement_key text NOT NULL,
  market text,
  locale text,
  inherits_from_id uuid REFERENCES cms_logical_media_placements(id) ON DELETE restrict,
  asset_id uuid REFERENCES cms_media_assets(id) ON DELETE restrict,
  media_version_id uuid REFERENCES cms_media_versions(id) ON DELETE restrict,
  migration_status text NOT NULL DEFAULT 'native'
    CHECK (migration_status IN ('native','backfilled','ambiguous','quarantined')),
  UNIQUE NULLS NOT DISTINCT (placement_key,market,locale)
);

CREATE TABLE IF NOT EXISTS cms_release_candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  market text NOT NULL,
  locale text NOT NULL,
  registry_version text NOT NULL,
  manifest jsonb NOT NULL,
  validation jsonb NOT NULL,
  validation_digest text NOT NULL,
  submitted_by_user_id uuid REFERENCES cms_users(id) ON DELETE restrict,
  reviewer_user_id uuid REFERENCES cms_users(id) ON DELETE restrict,
  approver_user_id uuid REFERENCES cms_users(id) ON DELETE restrict,
  grant_version integer,
  separation_of_duties_valid boolean NOT NULL,
  created_by_user_id uuid NOT NULL REFERENCES cms_users(id) ON DELETE restrict,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS cms_release_candidates_scope_idx
  ON cms_release_candidates(market,locale,created_at DESC);

CREATE TABLE IF NOT EXISTS cms_release_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  release_number bigint GENERATED ALWAYS AS IDENTITY,
  market text NOT NULL,
  locale text NOT NULL,
  registry_version text NOT NULL,
  candidate_id uuid NOT NULL REFERENCES cms_release_candidates(id) ON DELETE restrict,
  manifest jsonb NOT NULL,
  validation_digest text NOT NULL,
  status text NOT NULL CHECK (status IN ('released','rolled-back','withdrawn')),
  previous_release_id uuid REFERENCES cms_release_receipts(id) ON DELETE restrict,
  submitter_user_id uuid REFERENCES cms_users(id) ON DELETE restrict,
  reviewer_user_id uuid REFERENCES cms_users(id) ON DELETE restrict,
  approver_user_id uuid REFERENCES cms_users(id) ON DELETE restrict,
  publisher_user_id uuid NOT NULL REFERENCES cms_users(id) ON DELETE restrict,
  grant_version integer,
  separation_of_duties_valid boolean NOT NULL,
  integrity_digest text NOT NULL,
  released_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (market,locale,release_number),
  UNIQUE (integrity_digest)
);
CREATE TABLE IF NOT EXISTS cms_active_releases (
  market text NOT NULL,
  locale text NOT NULL,
  release_id uuid NOT NULL REFERENCES cms_release_receipts(id) ON DELETE restrict,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (market,locale)
);

CREATE TABLE IF NOT EXISTS cms_release_migration_records (
  record_type text NOT NULL,
  record_id text NOT NULL,
  status text NOT NULL CHECK (status IN ('native','backfilled','ambiguous','quarantined','parity-proven')),
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  reversible_payload jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (record_type,record_id)
);

CREATE TABLE IF NOT EXISTS cms_withdrawal_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES cms_documents(id) ON DELETE restrict,
  market text NOT NULL,
  locale text NOT NULL,
  reason text NOT NULL,
  status text NOT NULL CHECK (status IN ('submitted','approved','published','restored','rejected')),
  impact jsonb NOT NULL DEFAULT '{}'::jsonb,
  submitted_by_user_id uuid NOT NULL REFERENCES cms_users(id) ON DELETE restrict,
  approved_by_user_id uuid REFERENCES cms_users(id) ON DELETE restrict,
  published_in_release_id uuid REFERENCES cms_release_receipts(id) ON DELETE restrict,
  restores_withdrawal_id uuid REFERENCES cms_withdrawal_receipts(id) ON DELETE restrict,
  retain_until timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- External accounts never inherit broad role grants or unbound media authority.
CREATE OR REPLACE FUNCTION cms_external_accounts_require_resource_grants()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.account_type='external-representative' AND NEW.role<>'viewer' THEN
    RAISE EXCEPTION 'external representatives must use the viewer compatibility role';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS cms_external_accounts_require_resource_grants_trigger ON cms_users;
CREATE TRIGGER cms_external_accounts_require_resource_grants_trigger
BEFORE INSERT OR UPDATE OF account_type,role ON cms_users
FOR EACH ROW EXECUTE FUNCTION cms_external_accounts_require_resource_grants();

-- Canonical case-study ownership cannot be changed through document writes.
CREATE OR REPLACE FUNCTION cms_partner_ownership_immutable()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.partner_document_id IS DISTINCT FROM NEW.partner_document_id THEN
    RAISE EXCEPTION 'partner ownership requires the administrator reassignment workflow';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS cms_partner_ownership_immutable_trigger ON cms_partner_ownership;
CREATE TRIGGER cms_partner_ownership_immutable_trigger
BEFORE UPDATE OF partner_document_id ON cms_partner_ownership
FOR EACH ROW EXECUTE FUNCTION cms_partner_ownership_immutable();