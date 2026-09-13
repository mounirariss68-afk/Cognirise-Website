-- Preserve immutable shared history for direct mutation while allowing the
-- existing document lifecycle to delete an eligible draft through FK cascade.
-- Public/published history remains protected by that lifecycle's own guards.
CREATE OR REPLACE FUNCTION cms_reject_shared_history_mutation() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' AND pg_trigger_depth() > 1 THEN
    RETURN OLD;
  END IF;
  RAISE EXCEPTION 'shared edition history is immutable';
END;
$$;