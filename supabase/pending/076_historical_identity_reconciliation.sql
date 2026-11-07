-- Immutable owner-only provenance for explicitly reviewed historical identity links.
-- This migration alone does not change any member, exam, account or membership.
CREATE TABLE exam_import_private.identity_reconciliation_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_id uuid NOT NULL,
  entity text NOT NULL CHECK(entity IN ('profile_created','profile_name','source_row','exam_record')),
  entity_id uuid NOT NULL,
  old_row jsonb,
  new_row jsonb NOT NULL,
  evidence jsonb NOT NULL,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(operation_id,entity,entity_id)
);
ALTER TABLE exam_import_private.identity_reconciliation_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_import_private.identity_reconciliation_audit FORCE ROW LEVEL SECURITY;
REVOKE ALL ON exam_import_private.identity_reconciliation_audit FROM public,anon,authenticated,service_role;
CREATE TRIGGER identity_reconciliation_audit_immutable BEFORE UPDATE OR DELETE
ON exam_import_private.identity_reconciliation_audit FOR EACH ROW
EXECUTE FUNCTION exam_import_private.preserve_source();
