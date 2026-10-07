# Release evidence packet

The approved V1 scope is `web-only`: the final release-window record contains eleven
SHA-256 evidence references. A `web-and-windows-uploader` release requires twelve. Those
references are not sufficient on their own: the protected files must still exist and
their exact bytes must match the reviewed digests.

Copy `release/release-evidence-index.template.json` outside the repository. Replace
every placeholder with an absolute path to the corresponding protected JSON record.
The index, release-window manifest and all evidence files must be regular files outside
the checkout. The release-window manifest and index cannot be reused as a gate-evidence
file. Links, duplicate files, missing files, invalid JSON and digest drift fail closed.

Set `release.scope` explicitly in the protected release-window manifest; missing or
unknown scope fails closed. For web-only, confirm `approvals.windowsUploaderWithheld`
is true only after verifying that no Windows installer is being distributed with this
release. Omit `gateEvidence.installerAcceptance` and the index's installer entry;
never mark a deferred installer as passed. Both checked-in templates target web-only
and remain intentionally incomplete. All other web evidence remains mandatory,
including Mux/provider delivery, recovery, Safari, monitoring and security.

For a separately approved combined release, set scope to `web-and-windows-uploader`,
add `evidenceFiles.installerAcceptance` to the index, and add the passing installer
summary to `gateEvidence.installerAcceptance`: `manifestSha256`, `result: "passed"`,
`environment: "staging"`, `projectRef: "eomubndonbetszdbhsrj"`, exact release
`commitSha`, `origin: "https://jingwuguanseibukan-staging.vercel.app"`,
`installerSha256`, `platform: "win32-x64"`,
`acceptancePolicy: "interactive-install-launch-uninstall"`, and
`authenticodeStatus: "Valid"`. Complete the unchanged standalone gate in
`operations/INSTALLER_RELEASE_READINESS.md` before using that summary. Deferral
neither signs an installer nor approves its distribution.

Run the packet check only after every applicable individual gate passes:

```powershell
npm.cmd run release:evidence:check -- `
  --index=C:\protected\jingwuguan-release-evidence-index.json `
  --expected-commit=<exact-40-character-release-sha> `
  --expected-deployment-id=<exact-production-deployment-id> `
  --expected-production-project-ref=<exact-20-character-production-ref>
```

The command first revalidates the release-window semantics, then hashes all eleven
web-only (or twelve combined-release)
protected evidence files and compares them with that manifest. It also reruns the
rollback evidence semantic validator against the exact candidate and known-good
commit/deployment identities and rollback decision deadline from the protected
release-window record. Hash-correct but semantically invalid or independently misbound
rollback JSON cannot pass. It separately reruns the production-cutover semantic
validator against the independently supplied production project, release commit and
deployment, and cross-checks its origin, exact 006–056 ledger and policy against the
release-window record. Hash-correct cutover placeholders or self-bound identities
cannot pass. The remaining child gates must still be run individually before packet
assembly.

The checker prints only bounded status information; it never prints file contents or
performs network, deployment, database or provider actions. A passing result is
necessary but does not itself authorize a release.
