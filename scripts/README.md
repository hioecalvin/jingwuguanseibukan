# Dummy test accounts

This seed creates 56 temporary accounts for local/staging testing.

## Accounts

- `0001` — Test Super Admin
- `0002` — Test Aikido Admin
- `0003` — Test Karate Admin
- `0004` — Test Kungfu Kids Admin
- `0005` — Test Taiji Admin
- `0006` — Test Xingyi Admin
- `0101-0110` — 10 Aikido Members
- `0201-0210` — 10 Karate Members
- `0301-0310` — 10 Kungfu Kids Members
- `0401-0410` — 10 Taiji Members
- `0501-0510` — 10 Xingyi Members

Shared TEST password: `00000000`

Profiles also receive `username = Member ID`, so they are suitable for testing a Member-ID login flow.

## Setup

Your `.env.local` needs:

```env
NEXT_PUBLIC_SUPABASE_URL=your-project-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

Never prefix the service-role key with `NEXT_PUBLIC_`.

Create a `scripts` folder in the project root and put the two `.mjs` files there.

Run:

```powershell
node .\scripts\seed-dummy-users.mjs
```

## Delete before production

Run:

```powershell
node .\scripts\delete-dummy-users.mjs
```

These accounts use emails ending in `@dummy.jingwuguan.test`, which gives the cleanup script a specific marker.

## Notes

- Super Admin `0001` also receives an Aikido membership so Member-facing screens can be tested.
- Each class receives one Admin.
- Where a class has active dojos, the seed assigns a dojo automatically.
- Aikido requires at least one active dojo.
- The 10 Aikido Members are distributed across active Aikido dojos.
- All seed memberships start Active, Mudansha, and unranked.
- The seed is rerunnable: existing dummy Auth users are updated and membership/profile rows are reused where possible.
