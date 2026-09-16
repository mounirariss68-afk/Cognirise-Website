-- Availability approval is a receipt for an exact destination matrix, not
-- merely a decision/version pair.  Keep the old reviewed_selections JSON as
-- the compatibility projection and add immutable destination identities so a
-- later content/materialization or destination change invalidates approval.
ALTER TABLE cms_document_availability_states
  ADD COLUMN IF NOT EXISTS reviewed_destination_pins jsonb NOT NULL DEFAULT '[]'::jsonb;