# Release evidence packet

The final release-window record contains eleven SHA-256 evidence references. Those
references are not sufficient on their own: the protected files must still exist and
their exact bytes must match the reviewed digests.

Copy `release/release-evidence-index.template.json` outside the repository. Replace
every placeholder with an absolute path to the corresponding protected JSON record.
The index, release-window manifest and all evidence files must be regular files outside
the checkout. The release-window manifest and index cannot be reused as a gate-evidence
file. Links, duplicate files, missing files, invalid JSON and digest drift fail closed.

Run the packet check only after every individual gate passes:

```powershell
npm.cmd run release:evidence:check -- `
  --index=C:\protected\jingwuguan-release-evidence-index.json `
  --expected-commit=<exact-40-character-release-sha> `
  --expected-production-project-ref=<exact-20-character-production-ref>
```

The command first revalidates the release-window semantics, then hashes all eleven
protected evidence files and compares them with that manifest. It prints only bounded
status information; it never prints file contents or performs network, deployment,
database or provider actions. A passing result is necessary but does not itself
authorize a release.
