import assert from "node:assert/strict";
import test from "node:test";

import {
  PRODUCTION_REGION,
  RETIRED_PROJECT_REF,
  STAGING_PROJECT_REF,
  evaluateProductionTarget,
} from "./production-target-readiness.mjs";

const PROJECT_REF = "abcdefghijklmnopqrst";

function validEnvironment(overrides = {}) {
  return {
    PRODUCTION_PROJECT_REF: PROJECT_REF,
    PRODUCTION_REGION,
    NEXT_PUBLIC_SUPABASE_URL: `https://${PROJECT_REF}.supabase.co`,
    PRODUCTION_DB_URL: `postgresql://postgres:private-value@db.${PROJECT_REF}.supabase.co:5432/postgres?sslmode=require`,
    ...overrides,
  };
}

test("accepts an exact Singapore production target using the direct connection", () => {
  const result = evaluateProductionTarget(validEnvironment());
  assert.equal(result.ready, true);
  assert.equal(result.target.projectRef, PROJECT_REF);
  assert.deepEqual(result.target.databaseConnection, {
    mode: "direct",
    host: `db.${PROJECT_REF}.supabase.co`,
    port: "5432",
    database: "postgres",
    tls: "require",
  });
  assert.doesNotMatch(JSON.stringify(result), /private-value/);
});

test("accepts only the Singapore session pooler for the exact project", () => {
  const result = evaluateProductionTarget(validEnvironment({
    PRODUCTION_DB_URL: `postgres://postgres.${PROJECT_REF}:private-value@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres?sslmode=require`,
  }));
  assert.equal(result.ready, true);
  assert.equal(result.target.databaseConnection.mode, "session-pooler");

  for (const databaseUrl of [
    `postgres://postgres.${PROJECT_REF}:private-value@aws-0-ap-southeast-2.pooler.supabase.com:5432/postgres?sslmode=require`,
    `postgres://postgres.otherprojectref1234:private-value@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres?sslmode=require`,
    `postgres://postgres.${PROJECT_REF}:private-value@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?sslmode=require`,
  ]) {
    assert.equal(evaluateProductionTarget(validEnvironment({ PRODUCTION_DB_URL: databaseUrl })).ready, false);
  }
});

test("rejects staging, retired and malformed project identities", () => {
  for (const projectRef of [STAGING_PROJECT_REF, RETIRED_PROJECT_REF, "short", "UPPERCASEPROJECTREF12"] ) {
    const result = evaluateProductionTarget(validEnvironment({ PRODUCTION_PROJECT_REF: projectRef }));
    assert.equal(result.ready, false);
    assert.ok(result.blockers.some(({ path }) => path === "PRODUCTION_PROJECT_REF"));
  }
});

test("rejects a mismatched API origin or non-Singapore declaration", () => {
  const wrongOrigin = evaluateProductionTarget(validEnvironment({
    NEXT_PUBLIC_SUPABASE_URL: "https://zyxwvutsrqponmlkjihg.supabase.co",
  }));
  assert.equal(wrongOrigin.ready, false);
  assert.ok(wrongOrigin.blockers.some(({ path }) => path === "NEXT_PUBLIC_SUPABASE_URL"));

  const wrongRegion = evaluateProductionTarget(validEnvironment({ PRODUCTION_REGION: "ap-southeast-2" }));
  assert.equal(wrongRegion.ready, false);
  assert.ok(wrongRegion.blockers.some(({ path }) => path === "PRODUCTION_REGION"));
});

test("rejects unsafe database connection shapes", () => {
  const unsafeUrls = [
    `postgresql://postgres:private-value@db.${PROJECT_REF}.supabase.co:5432/postgres`,
    `postgresql://postgres@db.${PROJECT_REF}.supabase.co:5432/postgres?sslmode=require`,
    `postgresql://postgres:private-value@db.${PROJECT_REF}.supabase.co:5432/other?sslmode=require`,
    `postgresql://postgres:private-value@db.${PROJECT_REF}.supabase.co:5432/postgres?sslmode=disable`,
    `postgresql://postgres:private-value@db.${PROJECT_REF}.supabase.co:5432/postgres?sslmode=require&sslmode=disable`,
    `postgresql://postgres:private-value@db.${PROJECT_REF}.supabase.co:5432/postgres?sslmode=require&application_name=unsafe`,
    `postgresql://postgres:private-value@db.otherprojectref123.supabase.co:5432/postgres?sslmode=require`,
  ];
  for (const databaseUrl of unsafeUrls) {
    const result = evaluateProductionTarget(validEnvironment({ PRODUCTION_DB_URL: databaseUrl }));
    assert.equal(result.ready, false, databaseUrl);
    assert.ok(result.blockers.some(({ path }) => path === "PRODUCTION_DB_URL"));
    assert.doesNotMatch(JSON.stringify(result), /private-value/);
  }
});
