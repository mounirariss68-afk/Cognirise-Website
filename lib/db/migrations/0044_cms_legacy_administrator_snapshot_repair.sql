-- Repair databases where migration 0040 was recorded but its administrator
-- snapshot rows or capture trigger are absent. The snapshot remains separate
-- from explicit capability configuration: configured matrices still win.
CREATE TABLE IF NOT EXISTS cms_legacy_administrator_market_snapshots (
  user_id uuid PRIMARY KEY REFERENCES cms_users(id) ON DELETE CASCADE,
  market_codes text[] NOT NULL DEFAULT '{}',
  captured_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO cms_legacy_administrator_market_snapshots(user_id,market_codes)
SELECT user_row.id,COALESCE(
  array_agg(market.code ORDER BY market.code) FILTER (WHERE market.enabled),
  '{}'
)
  FROM cms_users user_row
  CROSS JOIN market_editions market
 WHERE user_row.role='administrator'
   AND NOT EXISTS (
     SELECT 1
       FROM cms_legacy_administrator_market_snapshots snapshot
      WHERE snapshot.user_id=user_row.id
   )
 GROUP BY user_row.id
ON CONFLICT (user_id) DO NOTHING;

CREATE OR REPLACE FUNCTION cms_capture_legacy_administrator_market_snapshot() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.role='administrator' AND (TG_OP='INSERT' OR OLD.role IS DISTINCT FROM 'administrator') THEN
    INSERT INTO cms_legacy_administrator_market_snapshots(user_id,market_codes)
    SELECT NEW.id,COALESCE(array_agg(code ORDER BY code) FILTER (WHERE enabled), '{}')
      FROM market_editions
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS cms_capture_legacy_administrator_market_snapshot ON cms_users;
CREATE TRIGGER cms_capture_legacy_administrator_market_snapshot
AFTER INSERT OR UPDATE OF role ON cms_users
FOR EACH ROW EXECUTE FUNCTION cms_capture_legacy_administrator_market_snapshot();