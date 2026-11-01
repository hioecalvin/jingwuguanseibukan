# JS Video Uploader signed-installer release gate

The approved 2 October 2026 V1 launch is web-only. This installer gate is deferred,
not passed or weakened, and the unsigned Windows candidate must not be distributed
as a production release. Complete this gate under separate approval before the later
Windows release. Web security, Mux playback/provider checks and operational gates
remain required for the web launch.

This gate records the evidence needed before the Windows x64 installer can be offered to users. The checker is deliberately offline: it does not build or sign the executable, run antivirus, open the installer, contact staging, contact Mux, or authorize production.

## Required evidence

1. Build the exact release commit and record the installer filename, byte length, and SHA-256.
2. Sign that exact executable with the approved organization code-signing certificate and a trusted timestamp. Record a `Valid` Authenticode result, signer subject, certificate thumbprint, SHA-256 digest algorithm, timestamp authority, and successful timestamp verification.
3. Scan the exact executable with current malware definitions. The scan must be no more than seven days old, clean, and report zero detections.
4. Inspect the packaged ASAR/resources. Only the staging public configuration may be embedded; Supabase secret/service-role keys, Mux credentials, private keys, email credentials, test-account credentials, and bearer tokens must be absent.
5. On a physical interactive Windows x64 machine with no existing JS Video Uploader installation, install and launch the exact artifact. Sign in with a protected staging-only Repository Uploader account, select a disposable local video, allow local processing, and verify the ready-to-upload boundary and staging target. Stop before pressing upload; no upload URL request, Repository Draft, or Mux asset is created by this gate. Exit and uninstall normally, then verify the product registration and captured install directory are gone.
6. Store only sanitized evidence digests in the manifest. Never put a username, email address, member number, password, access token, publishable key, secret, local path, or machine/user name in the manifest.
7. A second person acting as the independent reviewer compares the artifact and evidence bundle, verifies all findings are resolved, and records only the reviewer role.

The existing `desktop/js-video-uploader/scripts/installer-acceptance.ps1` remains the interactive installation harness. Its output can support step 5, but its current preflight is not proof of a signed release: the final gate additionally requires independent artifact identity, valid code-signing/timestamp evidence, malware evidence, packaged-secret inspection, the staging upload boundary, and independent review.

## Run the offline gate

Copy `release/installer-release-evidence.template.json` outside the repository, fill it with sanitized evidence, then run:

```powershell
node scripts/installer-release-readiness.mjs `
  --manifest=C:\protected\installer-release-evidence.json `
  --expected-commit=<exact-40-character-release-sha> `
  --expected-sha256=<independently-calculated-installer-sha256> `
  --expected-bytes=<independently-observed-byte-length> `
  --expected-signer-subject="<approved-certificate-subject>" `
  --expected-signer-thumbprint=<approved-uppercase-certificate-thumbprint>
```

The expected commit, hash, size, signer subject, and thumbprint must come from an independently trusted release record, not by copying values out of the submitted manifest. A zero exit code means only that the sanitized evidence is internally consistent and meets this policy. It is not a deployment approval.
