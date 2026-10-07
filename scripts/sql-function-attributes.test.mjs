import assert from "node:assert/strict";
import test from "node:test";
import { functionDeclarations, hasFixedPublicSearchPath } from "./sql-function-attributes.mjs";

test("inline attributes and attributes following the body are inspected", () => {
  for (const sql of [
    "create function f() returns bool language sql stable security definer set search_path = public as $$select true;$$;",
    "create function f() returns bool as $body$select true;$body$ language sql stable security definer set search_path to 'public';",
  ]) {
    const [declaration] = functionDeclarations(sql);
    assert.match(declaration, /security definer/i);
    assert.equal(hasFixedPublicSearchPath(declaration), true);
  }
});

test("comments and function-body text cannot fake a fixed search_path", () => {
  const sql = "/* /* nested */ security definer */ create function f() returns bool language plpgsql security definer as $$begin perform 'set search_path = public'; return true; end;$$;";
  const [declaration] = functionDeclarations(sql);
  assert.equal(hasFixedPublicSearchPath(declaration), false);
  assert.equal(functionDeclarations("-- create function fake() security definer\nselect 1;").length, 0);
});

test("unsafe or inherited paths are rejected", () => {
  for (const setting of ["from current", "= pg_temp, public", "= public, attacker", "= public, '$user'", "= public, pg_temp, attacker"]) {
    assert.equal(hasFixedPublicSearchPath(`create function f() returns bool security definer set search_path ${setting}`), false);
  }
  assert.equal(hasFixedPublicSearchPath("create function f() returns bool security definer set search_path = public, pg_temp"), true);
});

test("unterminated lexical constructs fail instead of hiding declarations", () => {
  for (const sql of ["/* comment", "as $$body", "select 'unclosed"]) assert.throws(() => functionDeclarations(sql));
});
