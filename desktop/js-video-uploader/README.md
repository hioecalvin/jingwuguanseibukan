# JS Video Uploader — Mux candidate (v0.9.0)

Windows-only Electron + React + TypeScript desktop app within the existing
Jingwuguan Seibukan Super App repository. It supports database-authorized Repository
Uploader/Super Admin sign-in, database-driven class/rank/tier selection, local FFmpeg
processing with current organization and class logo watermarks, direct Mux upload,
signed Mux playback, and an RPC-guarded repository Draft save.

## Install the preview

Run `release/JS-Video-Uploader-Setup.exe` on Windows x64, choose the installation
folder and launch JS Video Uploader. Node.js, VS Code and scripts are not required.
The current candidate connects only to the approved **staging** Supabase project.
Use an existing staging Repository Uploader or Super Admin account; production is
not connected. Mux credentials never enter the installer: the Super App server issues
one-time direct-upload URLs after authenticating the uploader and class scope.

The installer is per-user, unsigned, uses the default Electron icon and does not
run automatically after installation. Windows ARM64/32-bit are not verified. The
packaged FFmpeg executable and its GPL license/readme are placed outside `app.asar`.

### Reproducible Windows acceptance

Run the guided acceptance script from a normal Windows desktop session before
distributing a newly built installer:

```powershell
npm run test:installer-preflight
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\installer-acceptance.ps1 `
  -ExpectedSha256 "<approved 64-character installer SHA-256>"
```

The preflight fingerprints the installer and refuses to proceed when the exact
per-user product is already installed. The full run opens the normal installer,
discovers only the exact `JS Video Uploader` uninstall registration, launches the
installed executable, requires a visible application window, allows a short visual
inspection, closes only that captured process, and opens the normal uninstaller. It
passes only when the product registration and captured installation directory are
gone. A timestamped JSON report is written under `test-results/` even on failure.

Run this from the interactive Windows account being accepted, not a service or
restricted CI desktop. Do not sign in during this packaging check; authentication,
role and provider acceptance are separate guarded tests. If the script reports an
existing installation, uninstall it manually and rerun rather than allowing the
candidate to overwrite it. The runner never silently removes an existing install.

## Development (Windows)

From this directory:

```powershell
npm ci
npm test
npm start
```

Ordinary builds have no connection configuration and disable sign-in. To build
the staging preview, supply a protected environment file outside the repository:

```powershell
npm run typecheck
node scripts/build-staging.mjs C:\protected\jingwuguan-staging.env
node scripts/smoke.mjs C:\protected\jingwuguan-staging.env
node node_modules/electron-builder/cli.js --win nsis --x64 --publish never --config.electronDist=node_modules/electron/dist
$env:DESKTOP_TEST_EXE = (Resolve-Path 'release/win-unpacked/JSVideoUploader.exe').Path
node scripts/smoke.mjs C:\protected\jingwuguan-staging.env
node scripts/verify-package.mjs C:\protected\jingwuguan-staging.env
```

`build-staging.mjs` passes only the public URL/key and site URL to the builder; it does
not copy the protected file. The URL is pinned to project `eomubndonbetszdbhsrj`.
Supabase secret/service-role and Mux credentials are rejected from the desktop build.
`npm test`, `npm start` and usual packaging
scripts rebuild without staging configuration unless JS_UPLOADER_PUBLIC_URL,
JS_UPLOADER_PUBLIC_KEY and JS_UPLOADER_ENVIRONMENT=Staging are set.

Read-only live role acceptance:
`node scripts/staging-acceptance.mjs C:\protected\jingwuguan-staging.env`.
This uses existing staging member/Admin/Super Admin fixtures, performs account,
profile and permission reads, and revokes only its own auth sessions. No database
fixture creation or mutation is performed.

Read-only class-logo origin audit:
`npm run audit:staging-logos -- C:\protected\jingwuguan-staging.env`.
The current staging checkpoint has current-project logos for all five uploadable
classes: Aikido, Karate, Kungfu Kids, Taiji and Xingyi.

## Authentication, upload and boundaries

- The Electron main process owns Supabase email/password auth. Session tokens
  never cross the preload bridge or persist to disk. Closing the process clears
  local access; explicit sign-out revokes only this desktop session. If the token
  expires, the user must sign in again. There is no remember-me feature.
- Every authorized result requires a network `getUser` check, an active profile,
  `is_active_app_user`, `is_super_admin` and `get_my_repository_upload_scopes`.
  Password-change-required and deceased accounts are denied.
- Class/rank/tier choices and current class-logo URLs come from the database. An
  ordinary Admin receives no uploader access unless separately appointed.
- Access revalidates every minute and on window focus; failures clear access.
  Future content operations must revalidate and use existing RLS/RPC enforcement
  at the point of action, not trust this display.
- Narrow bridge methods expose app info, sign-in, access refresh, sign-out, local
  video selection and one guarded upload operation. Renderer network remains blocked.
  They verify the exact local main-frame sender.
- Renderer sandbox/context isolation, no Node/webviews, denied navigation/popups,
  denied network/browser permissions, packaged-only CSP.
- Main-process Supabase requests use the staging public key and signed-in user's token,
  a 15-second timeout and no redirects. No service key or Mux credential is packaged.
- The processed MP4 travels directly from the desktop to the one-time, HTTPS Mux
  upload address. The uploader accepts only Mux's exact regional
  `direct-uploads-*.mux.com/upload/{id}` shape or its legacy Google Storage shape;
  deceptive hosts, credentials, custom ports, fragments and unrelated paths fail closed.
- The Super App verifies the upload owner and current class appointment before it
  exposes processing status, and the database creates every completed item as Draft.
- Independent desktop package/lockfile; root TypeScript/ESLint/Vercel exclude it.

## Provider requirements

- Create one Mux API access token with video read/write permission and configure
  `MUX_TOKEN_ID` and `MUX_TOKEN_SECRET` on the Super App server only.
- Create a Mux URL-signing key and configure `MUX_SIGNING_KEY_ID` plus the private
  key PEM encoded as base64 in `MUX_SIGNING_PRIVATE_KEY`, also server-only.
- Migration 056 must be present before enabling Mux uploads. It preserves legacy
  YouTube items, while all new uploader-created videos use Mux signed playback. The
  current staging project has migration 056 and guarded signed-playback acceptance;
  production has not been configured.
- Every successful upload is saved to JS as **Draft**, never auto-published.
- JS passwords and Supabase sessions remain memory-only. The installer contains no
  Mux API token, signing key, service-role key, or other provider secret.
- Member playback first passes the existing repository RLS rules, then receives a
  short-lived signed playback token. A copied Mux playback ID alone is not playable.
