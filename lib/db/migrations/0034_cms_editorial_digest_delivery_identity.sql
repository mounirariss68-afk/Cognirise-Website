-- A digest retry must retain not only its notification selection and
-- idempotency key, but also the exact delivery configuration identity.
-- Existing jobs intentionally remain unbound and are blocked by the worker:
-- guessing an old provider or connector account could send a retry elsewhere.
ALTER TABLE cms_editorial_digest_jobs
  ADD COLUMN IF NOT EXISTS delivery_provider text,
  ADD COLUMN IF NOT EXISTS delivery_configuration_fingerprint text,
  ADD COLUMN IF NOT EXISTS delivery_connection_id text;

ALTER TABLE cms_editorial_digest_jobs
  DROP CONSTRAINT IF EXISTS cms_editorial_digest_jobs_delivery_identity_check;
ALTER TABLE cms_editorial_digest_jobs
  ADD CONSTRAINT cms_editorial_digest_jobs_delivery_identity_check CHECK (
    (delivery_provider IS NULL
      AND delivery_configuration_fingerprint IS NULL
      AND delivery_connection_id IS NULL)
    OR (delivery_provider='webhook'
      AND delivery_configuration_fingerprint IS NOT NULL
      AND delivery_connection_id IS NULL)
    OR (delivery_provider='resend'
      AND delivery_configuration_fingerprint IS NOT NULL
      AND delivery_connection_id IS NOT NULL)
  );