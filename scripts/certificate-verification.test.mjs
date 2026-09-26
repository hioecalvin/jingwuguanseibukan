import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const verificationPage = await readFile(
  new URL("../app/certificate/verify/[certificateId]/page.tsx", import.meta.url),
  "utf8",
);
const assessmentPage = await readFile(
  new URL("../app/admin/assessments/page.tsx", import.meta.url),
  "utf8",
);
const certificatePdf = await readFile(
  new URL("../components/GradeCertificatePDF.tsx", import.meta.url),
  "utf8",
);
const migration = await readFile(
  new URL("../supabase/migrations/042_prepare_assessment_certificates.sql", import.meta.url),
  "utf8",
);

test("QR payload carries the requested facts and a database verification URL", () => {
  for (const field of ["name=", "rank=", "date=", "assessor=", "verify="]) {
    assert.match(assessmentPage, new RegExp(`encodeURIComponent\\(.*${field}|${field}`, "i"));
  }
  assert.match(assessmentPage, /QRCode\.toDataURL\(barcodePayload/i);
  assert.match(certificatePdf, /verificationBarcodeUrl[\s\S]*SCAN TO VERIFY AUTHENTICITY/i);
  assert.match(
    certificatePdf,
    /JINGWUGUAN SEIBUKAN[\s\S]*record\.class_name\.toUpperCase\(\)[\s\S]*CERTIFICATE OF PROMOTION/i,
  );
});

test("printed certificate has only the authorized-signatory signature line", () => {
  const signatureSections = [
    ...certificatePdf.matchAll(/\* SIGNATURES[\s\S]*?\* AUDIT FOOTER/gi),
  ];
  const signatureSection = signatureSections.at(-1)?.[0];
  assert.ok(signatureSection);
  assert.match(signatureSection, /Authorized Signatory/i);
  assert.doesNotMatch(signatureSection, /Grading Assessor/i);
  assert.match(certificatePdf, /Grading Assessor[\s\S]*\{assessorName\}/i);
});

test("public scan page validates through a server-only RPC without offering a document", () => {
  assert.match(verificationPage, /createAdminClient\(\)/i);
  assert.match(verificationPage, /verify_prepared_assessment_certificate/i);
  assert.match(verificationPage, /ISSUED - VALID/i);
  assert.match(verificationPage, /VOID - NOT VALID/i);
  assert.match(verificationPage, /PENDING - NOT YET VALID/i);
  assert.match(verificationPage, /does not provide a certificate download/i);
  assert.doesNotMatch(verificationPage, /<a\b|href=|\.pdf\b/i);
});

test("members cannot read or execute the prepared-certificate storage boundary", () => {
  assert.match(
    migration,
    /revoke all on table public\.prepared_assessments,[\s\S]*public\.prepared_assessment_candidates,[\s\S]*public\.prepared_assessment_certificates[\s\S]*from public, anon, authenticated/i,
  );
  assert.match(migration, /Only an active Super Admin can print prepared certificates/i);
  assert.match(migration, /verify_prepared_assessment_certificate\(uuid\)[\s\S]*to service_role/i);
});
