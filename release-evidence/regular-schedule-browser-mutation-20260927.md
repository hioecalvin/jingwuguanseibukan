# Regular-schedule browser mutation evidence — 27 September 2026

## Scope

The fixture imports the production `app/admin/schedules/page.tsx` component and
substitutes only the Supabase client with an in-memory implementation of the exact
RPC names and argument contract. Its CSP permits no network connection.

Verified behaviors:

- loads only the assigned dojo/class management scope;
- loads the instructor options for the selected dojo;
- creates a weekly schedule with day, time, instructor, venue and notes;
- edits the same schedule and marks it inactive;
- renders normalized schedule details and status after each reload;
- presents an RPC validation error; and
- leaves no schedule row after the rejected request.

## Results

- Chromium desktop and WebKit desktop: 50/50 complete browser checks passed.
- Chromium mobile, WebKit tablet and WebKit mobile: 75/75 complete browser checks
  passed.
- Schedule-specific result: 10/10 checks (two workflows across five profiles).
- TypeScript, application tests, lint and production build remain separate release
  gates.

The browser fixture contacted neither staging nor production. Persisted database
authorization, auditing, scope and rollback behavior are covered by the existing
rollback-contained staging schedule acceptance suite.
