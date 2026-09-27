# JS Video Uploader — provider-ready Stage G candidate (v0.8.1)

Windows-only Electron + React + TypeScript desktop app within the existing
Jingwuguan Seibukan Super App repository. It supports database-authorized Repository
Uploader/Super Admin sign-in, database-driven class/rank/tier selection, local FFmpeg
processing with current organization and class logo watermarks, Google desktop OAuth,
resumable YouTube upload and an RPC-guarded repository Draft save.

## Install the preview

Run `release/JS-Video-Uploader-Setup.exe` on Windows x64, choose the installation
folder and launch JS Video Uploader. Node.js, VS Code and scripts are not required.
The current candidate connects only to the approved **staging** Supabase project.
Use an existing staging Repository Uploader or Super Admin account; production is
not connected. A build without the public Google OAuth client ID and expected
organization YouTube channel ID remains installable but upload is deliberately disabled.

The installer is per-user, unsigned, uses the default Electron icon and does not
run automatically after installation. Windows ARM64/32-bit are not verified. The
packaged FFmpeg executable and its GPL license/readme are placed outside `app.asar`.

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

`build-staging.mjs` passes only the public URL/key to the builder; it does not copy
the protected file. It may also pass the public installed-app OAuth client ID and
public YouTube channel ID. The URL is pinned to project `eomubndonbetszdbhsrj`.
Secret and service-role keys are rejected. `npm test`, `npm start` and usual packaging
scripts rebuild without staging configuration unless JS_UPLOADER_PUBLIC_URL,
JS_UPLOADER_PUBLIC_KEY and JS_UPLOADER_ENVIRONMENT=Staging are set.

Read-only live role acceptance:
`node scripts/staging-acceptance.mjs C:\protected\jingwuguan-staging.env`.
This uses existing staging member/Admin/Super Admin fixtures, performs account,
profile and permission reads, and revokes only its own auth sessions. No database
fixture creation or mutation is performed.

Read-only class-logo origin audit:
`npm run audit:staging-logos -- C:\protected\jingwuguan-staging.env`.
The 27 September staging audit found current logos for Karate, Taiji and Xingyi,
the Aikido logo still on the retired Supabase project, and no Kungfu Kids logo.

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
  a 15-second timeout and no redirects. No service key or Google credentials.
- Independent desktop package/lockfile; root TypeScript/ESLint/Vercel exclude it.

## Provider requirements

- Enable YouTube Data API v3 in the organization Google Cloud project.
- Create an OAuth client of type **Desktop app**, then provide its public client ID.
- Provide the exact organization YouTube channel ID. The app verifies it before upload.
- Google requires API-project verification/audit before new projects may upload as
  Unlisted/Public; otherwise YouTube forces uploaded videos to Private.
- Google access tokens, JS passwords and JS sessions remain memory-only.
- Videos go directly from the desktop to YouTube and never through Vercel or Supabase Storage.
- Every successful video is saved to JS as **Draft**, never auto-published.
- Resumable upload addresses are accepted only from the exact HTTPS Google API
  upload endpoint and must carry an upload session ID.
