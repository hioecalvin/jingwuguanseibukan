# Repository video decision

Status: **YouTube Unlisted selected for production v1. Cloudflare Stream is
cancelled.**

## V1 design

- Administrators upload each video to the organization-controlled YouTube
  channel and set its visibility to **Unlisted**.
- The content screen accepts only a valid YouTube URL or 11-character video ID.
- Member playback uses YouTube's privacy-enhanced embed origin.
- The application places two non-interactive client-side logos over the player:
  the Jingwuguan Seibukan logo and the current class logo.
- Changing a class logo updates the overlay without re-uploading videos. Changing
  `/public/js-logo.jpeg` updates the organization overlay after the application is
  redeployed.
- No viewer name, member number, email address, or moving identity watermark is
  displayed.

## Security and privacy limits

An unlisted YouTube video is not private DRM content. Anyone who obtains the link
may be able to share it, and a user can record the screen or remove page overlays
with browser tools. The two logos are visible branding and deterrence, not
permanent burned-in watermarks. They may also be absent while the YouTube player
is in native fullscreen.

The application still restricts the repository page by its existing membership,
class, rank, and tier authorization. YouTube itself does not enforce those app
permissions. Do not upload sensitive personal information or material whose
contract requires durable access control.

## Operator workflow

1. Upload from the organization-owned YouTube account.
2. Set visibility to **Unlisted**, not Public or Private. Private videos generally
   cannot be played by ordinary embedded members.
3. Disable embedding only if the video should not be available in the app.
4. Paste the URL into Admin → Content and verify its preview and class assignment.
5. Test playback while signed in as a dedicated Member with the intended scope.
6. After a logo change, clear the deployment cache if needed and verify both logos
   on desktop, tablet, mobile, and Safari. Existing YouTube video uploads do not
   need to be replaced.

No YouTube API key is needed for this embed-only design. YouTube channel custody,
two-factor authentication, recovery contacts, and video visibility audits remain
operational release requirements.

Migrations 024 and 025 remain in the migration chain because they were already
applied to staging and migration history must not be rewritten. Their Cloudflare
tables are dormant historical schema; the active application no longer calls them.
