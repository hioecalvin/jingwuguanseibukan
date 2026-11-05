-- Source-bound recovery provenance; data changes require the reviewed owner envelope.
CREATE TABLE member_import_private.enrollment_recovery_audit (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), operation_id uuid NOT NULL,
 entity text NOT NULL CHECK(entity IN ('rank_created','rank_order','membership_created','exam_rank')),
 entity_id uuid NOT NULL, old_row jsonb, new_row jsonb NOT NULL,
 evidence jsonb NOT NULL, recorded_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(operation_id,entity,entity_id)
);
ALTER TABLE member_import_private.enrollment_recovery_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_import_private.enrollment_recovery_audit FORCE ROW LEVEL SECURITY;
REVOKE ALL ON member_import_private.enrollment_recovery_audit FROM public,anon,authenticated,service_role;
CREATE TRIGGER enrollment_recovery_audit_immutable BEFORE UPDATE OR DELETE
ON member_import_private.enrollment_recovery_audit FOR EACH ROW
EXECUTE FUNCTION member_import_private.preserve_membership_date_evidence();
