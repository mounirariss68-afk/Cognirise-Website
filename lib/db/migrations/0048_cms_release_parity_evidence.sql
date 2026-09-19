-- Every new promotion carries the exact build-time parity report and digests
-- binding it to the deployed source commit and immutable release receipt.
ALTER TABLE cms_release_receipts
  ADD COLUMN IF NOT EXISTS source_commit text,
  ADD COLUMN IF NOT EXISTS parity_report jsonb,
  ADD COLUMN IF NOT EXISTS parity_report_digest text,
  ADD COLUMN IF NOT EXISTS parity_attestation_digest text;

ALTER TABLE cms_release_receipts
  ADD CONSTRAINT cms_release_receipts_parity_evidence_check
  CHECK (
    source_commit IS NOT NULL
    AND source_commit ~ '^[0-9a-fA-F]{40,64}$'
    AND parity_report IS NOT NULL
    AND parity_report->>'status'='pass'
    AND parity_report->>'sourceCommit'=source_commit
    AND parity_report_digest IS NOT NULL
    AND parity_report_digest ~ '^[0-9a-f]{64}$'
    AND parity_attestation_digest IS NOT NULL
    AND parity_attestation_digest ~ '^[0-9a-f]{64}$'
  ) NOT VALID;