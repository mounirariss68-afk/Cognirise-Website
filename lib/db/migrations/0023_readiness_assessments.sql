CREATE TABLE IF NOT EXISTS "readiness_assessments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "answers" jsonb NOT NULL,
  "decision" text NOT NULL,
  "unresolved_condition_ids" text[] NOT NULL,
  "delete_token_hash" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  CONSTRAINT "readiness_assessments_decision_check" CHECK ("decision" IN ('proceed', 'prepare', 'stop'))
);

CREATE INDEX IF NOT EXISTS "readiness_assessments_expires_at_idx"
  ON "readiness_assessments" ("expires_at");