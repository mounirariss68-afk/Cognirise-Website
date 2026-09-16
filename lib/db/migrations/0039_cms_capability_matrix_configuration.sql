-- Task 345: durable matrix-mode sentinel.
-- A configured user remains explicit-deny-all even when every grant row is
-- intentionally removed. Existing non-empty matrices retain their current
-- explicit semantics; accounts without any saved grants remain legacy.
CREATE TABLE IF NOT EXISTS cms_user_capability_configurations (
  user_id uuid PRIMARY KEY REFERENCES cms_users(id) ON DELETE CASCADE,
  configured_by_user_id uuid REFERENCES cms_users(id) ON DELETE SET NULL,
  configured_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS cms_user_capability_configurations_actor_idx
  ON cms_user_capability_configurations(configured_by_user_id);

-- 0037 could only create non-empty explicit matrices. Preserve their intended
-- authority mode without changing users, markets, grants, or content records.
INSERT INTO cms_user_capability_configurations(user_id,configured_at)
SELECT DISTINCT user_id,now()
  FROM cms_user_capability_grants
ON CONFLICT (user_id) DO NOTHING;