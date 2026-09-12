CREATE TABLE IF NOT EXISTS "cms_operation_receipts" (
  "idempotency_key" text PRIMARY KEY NOT NULL,
  "operation" text NOT NULL,
  "subject_id" text NOT NULL,
  "request_digest" text NOT NULL,
  "result_digest" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE "cms_operation_receipts"
  ADD COLUMN IF NOT EXISTS "actor_user_id" uuid REFERENCES "cms_users"("id") ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS "response" jsonb,
  ADD COLUMN IF NOT EXISTS "status_code" integer;

CREATE INDEX IF NOT EXISTS "cms_operation_receipts_actor_idx"
  ON "cms_operation_receipts" ("actor_user_id", "created_at");

CREATE TABLE IF NOT EXISTS "cms_access_delivery_jobs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "cms_users"("id") ON DELETE CASCADE,
  "access_token_id" uuid NOT NULL REFERENCES "cms_user_access_tokens"("id") ON DELETE CASCADE,
  "purpose" text NOT NULL,
  "status" text NOT NULL DEFAULT 'pending',
  "attempts" integer NOT NULL DEFAULT 0,
  "payload_ciphertext" text NOT NULL,
  "payload_expires_at" timestamp with time zone NOT NULL,
  "available_at" timestamp with time zone NOT NULL DEFAULT now(),
  "last_attempt_at" timestamp with time zone,
  "sent_at" timestamp with time zone,
  "failed_at" timestamp with time zone,
  "provider_message_id" text,
  "last_error" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "cms_access_delivery_jobs_due_idx"
  ON "cms_access_delivery_jobs" ("status", "available_at");
CREATE INDEX IF NOT EXISTS "cms_access_delivery_jobs_user_idx"
  ON "cms_access_delivery_jobs" ("user_id", "created_at");