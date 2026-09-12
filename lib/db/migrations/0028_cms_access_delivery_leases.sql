ALTER TABLE "cms_access_delivery_jobs"
  ALTER COLUMN "payload_ciphertext" DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS "processing_lease" uuid;

CREATE INDEX IF NOT EXISTS "cms_access_delivery_jobs_processing_lease_idx"
  ON "cms_access_delivery_jobs" ("processing_lease")
  WHERE "processing_lease" IS NOT NULL;