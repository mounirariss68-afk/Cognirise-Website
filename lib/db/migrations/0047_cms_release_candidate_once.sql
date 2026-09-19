-- A prepared candidate is immutable and may create at most one normal release
-- receipt. Retries return that receipt rather than publishing it again.
CREATE UNIQUE INDEX IF NOT EXISTS cms_release_receipts_candidate_once_uidx
  ON cms_release_receipts(candidate_id)
  WHERE status='released';