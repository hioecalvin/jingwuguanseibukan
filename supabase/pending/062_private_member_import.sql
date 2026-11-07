-- Private source preservation only. Does NOT create application members or logins.
-- Applied through an explicit target-bound transaction with an exact source hash.
CREATE SCHEMA member_import_private AUTHORIZATION postgres;
REVOKE ALL ON SCHEMA member_import_private FROM PUBLIC, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA member_import_private
  REVOKE ALL ON TABLES FROM PUBLIC, anon, authenticated, service_role;

CREATE TABLE member_import_private.batches (
  source_sha256 text PRIMARY KEY CHECK (source_sha256 ~ '^[0-9a-f]{64}$'),
  source_filename text NOT NULL,
  imported_at timestamptz NOT NULL DEFAULT now(),
  imported_by name NOT NULL DEFAULT current_user,
  source_rows integer NOT NULL CHECK (source_rows > 0),
  source_headers jsonb NOT NULL CHECK (jsonb_typeof(source_headers) = 'array'),
  decisions jsonb NOT NULL CHECK (jsonb_typeof(decisions) = 'object'),
  state text NOT NULL DEFAULT 'pending_member_conversion'
    CHECK (state = 'pending_member_conversion')
);

CREATE TABLE member_import_private.source_rows (
  source_sha256 text NOT NULL REFERENCES member_import_private.batches(source_sha256) ON DELETE RESTRICT,
  sheet_name text NOT NULL CHECK (sheet_name = 'MEMBER DATA'),
  row_number integer NOT NULL CHECK (row_number >= 6),
  source_json text NOT NULL CHECK (jsonb_typeof(source_json::jsonb) = 'array'),
  row_sha256 text NOT NULL CHECK (
    row_sha256 = encode(sha256(convert_to(source_json, 'UTF8')), 'hex')),
  disposition text NOT NULL CHECK (disposition IN (
    'pending_member_conversion', 'held_for_review', 'existing_owner_preserved', 'orphan_held')),
  review_reasons jsonb NOT NULL CHECK (jsonb_typeof(review_reasons) = 'array'),
  PRIMARY KEY (source_sha256, sheet_name, row_number)
);

ALTER TABLE member_import_private.batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_import_private.batches FORCE ROW LEVEL SECURITY;
ALTER TABLE member_import_private.source_rows ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_import_private.source_rows FORCE ROW LEVEL SECURITY;
REVOKE ALL ON ALL TABLES IN SCHEMA member_import_private FROM PUBLIC, anon, authenticated, service_role;
COMMENT ON SCHEMA member_import_private IS
  'Restricted Excel source intake. No API access, member creation, identity claims, messages or login rights.';
