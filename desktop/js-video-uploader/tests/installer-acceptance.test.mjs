import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const runner = await readFile(new URL("../scripts/installer-acceptance.ps1", import.meta.url), "utf8");
const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));

test("installer candidate remains an explicit per-user Windows x64 package", () => {
  assert.equal(packageJson.build.win.target[0].target, "nsis");
  assert.deepEqual(packageJson.build.win.target[0].arch, ["x64"]);
  assert.equal(packageJson.build.nsis.oneClick, false);
  assert.equal(packageJson.build.nsis.perMachine, false);
  assert.equal(packageJson.build.nsis.allowElevation, false);
  assert.equal(packageJson.build.nsis.runAfterFinish, false);
  assert.equal(packageJson.build.nsis.deleteAppDataOnUninstall, false);
});

test("full acceptance fails closed without the separately approved installer hash", () => {
  assert.match(runner, /-not \$PreflightOnly -and \[string\]::IsNullOrWhiteSpace\(\$ExpectedSha256\)/);
  assert.match(runner, /ExpectedSha256 is required for the full installer acceptance/);
  assert.match(runner, /\$hash -ne \$ExpectedSha256\.ToUpperInvariant\(\)/);
  assert.ok(
    runner.indexOf("ExpectedSha256 is required") < runner.indexOf("Start-Process -FilePath $resolvedInstaller"),
    "hash approval must be required before launching the installer",
  );
});

test("physical acceptance is pinned to interactive Windows x64 and exact per-user registration", () => {
  assert.match(runner, /OSArchitecture -ne \[Runtime\.InteropServices\.Architecture\]::X64/);
  assert.match(runner, /-not \[Environment\]::UserInteractive/);
  assert.match(runner, /HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall/);
  assert.match(runner, /Where-Object \{ \$_\.DisplayName -eq \$productName \}/);
  assert.match(runner, /if \(\$baseline\.Count -ne 0\)/);
  assert.doesNotMatch(runner, /Remove-Item|Win32_Product|msiexec/i);
});

test("preflight remains separated from install and evidence cannot target an executable", () => {
  const preflightReturn = runner.indexOf('Add-Step "preflight" "passed"');
  const installerLaunch = runner.indexOf("Start-Process -FilePath $resolvedInstaller");
  assert.ok(preflightReturn >= 0 && installerLaunch > preflightReturn);
  assert.match(runner, /EvidencePath must identify a \.json file/);
  assert.match(runner, /EvidencePath must not overwrite the installer/);
});

test("runner never performs hidden cleanup after an incomplete physical acceptance", () => {
  const finallyBlock = runner.slice(runner.lastIndexOf("} finally {"));
  assert.match(finallyBlock, /\$applicationProcess\.Kill\(\)/);
  assert.match(finallyBlock, /Write-Evidence/);
  assert.doesNotMatch(finallyBlock, /uninstall|Remove-Item|Start-Process/i);
});
