-- Local role/claim helper compatibility, NOT real JWT verification or login evidence.
set local plpgsql.check_asserts=on;
set local role authenticated;
do $claims$
begin
  perform set_config('request.jwt.claim.sub','',true);
  perform set_config('request.jwt.claim.role','',true);
  perform set_config('request.jwt.claim','',true);
  perform set_config('request.jwt.claims','',true);
  assert auth.uid() is null and auth.role() is null and auth.jwt() is null,'No fabricated identity/role';
  perform set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
  assert auth.uid()='10000000-0000-4000-8000-000000000001'::uuid,'JSON subject fallback';
  assert auth.role()='authenticated','JSON role fallback';
  assert auth.jwt()->>'role'='authenticated','Plural claims fallback';
  perform set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000002',true);
  perform set_config('request.jwt.claim.role','anon',true);
  assert auth.uid()='10000000-0000-4000-8000-000000000002'::uuid,'Scalar subject precedence';
  assert auth.role()='anon','Role comes from claims, not SET ROLE or hardcoded authenticated';
  perform set_config('request.jwt.claim','{"role":"fixture"}',true);
  assert auth.jwt()->>'role'='fixture','Singular claims precedence';
  perform set_config('request.jwt.claim.sub','not-a-uuid',true);
  begin
    perform auth.uid();
    raise exception 'Invalid UUID accepted' using errcode='XX000';
  exception when invalid_text_representation then null; end;
  raise notice 'PASS: captured Auth helper precedence, fallbacks, missing claims and malformed identity';
end $claims$;
reset role;
