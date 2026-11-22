# Shared referrals: run and publish

The repository now includes a Node server and SQLite database, team password sign-in,
consented customer referral requests, private vendor update links, and automatic
10-second dashboard refreshes. Nothing is deployed or emailed by committing this code.
The existing standalone pages and local tracker still work without the shared server.

## Try it locally

Use Node **22.13 or newer** (Node 24 recommended), from the repository folder:

```sh
npm ci
npm run setup:shared
npm start
```

`setup:shared` creates a private, ignored `.env` with a random team password and a
32-byte contact-encryption key. It refuses to overwrite an existing file. Read the
password privately from that file; do not paste it into public messages or commit it.
Open `http://127.0.0.1:3000/vendor-tracker.html` on the computer running the server.
Choose **Sign in to shared workspace**. The account is one shared team password,
not individual user accounts or single sign-on. Vendor links never include it.

The database defaults to `.local/helio.sqlite`. `.env`, `.local/`, and SQLite files
are ignored by Git. These files contain private application state and are not served
by the web server. If shared settings are missing, the server serves the local tools
and reports shared tracking unavailable instead of enabling unauthenticated writes.

## Customer → team → vendor

1. Add real, checked vendors to `referral-vendors.js` (documented in README), then
   run `npm run build` and restart the server. **The production directory is still
   empty.** No synthetic test providers are published. Shared requests appear only
   for configured, matched vendors, after replacing any example bills.
2. The homeowner chooses a provider and **Request a tracked referral**, supplies a
   contact email, and explicitly agrees to share the email/service with that vendor.
   The request creates a referral and returns a reference. Bills, photos, home answers,
   names and addresses are not included. A request does not book an appointment.
3. Signed-in team dashboards pick up the record automatically, normally within ten
   seconds. Changes made in shared mode save to the server immediately. Separate
   local snapshots are not uploaded or replaced. Device load/import/save/delete
   controls are disabled while shared mode is active; signing out restores the
   tab's earlier local copy. An export is an anonymous tracker snapshot, not a full
   server backup or a contact-data export.
4. Choose **Vendor link** on a referral, then copy and privately share it yourself.
   It grants access to that referral and its consented email, not other referrals,
   team assignments, ratings or the dashboard. Anyone holding the link has that
   access; it does not independently verify a person's identity. Nothing sends the
   link by email or text automatically.
5. The vendor opens the link, confirms the status and dates, and submits. The team
   charts, totals and attention queue refresh automatically. Statuses are vendor-
   reported, not independently confirmed completion or automatic phone/email tracking.
   Vendors cannot move a project backwards; the team can correct mistaken stages.
6. Links expire after seven days. Creating a new link invalidates the old one and
   its sessions; **Revoke link** disables it immediately. Changing a referral’s vendor name also revokes its existing vendor access. Team/vendor sessions last
   up to eight hours, and vendor sessions also depend on a current unexpired grant.

Shared dates use **America/Los_Angeles**, the business time zone for Bakersfield.
Timeline timestamps are stored in UTC and displayed in the browser's local time.
Conflicting updates return an error rather than overwrite newer work. The form is
retained so the team can cancel editing, load the latest record, and reapply changes.
A lost connection does not silently switch shared edits into a local-only copy.

## Publish when you choose hosting

Use a host that runs Node and provides a **persistent disk**, a public HTTPS address,
and secret environment variables. A static-only host such as GitHub Pages cannot run
this backend. Run one server instance against one SQLite database; use a managed
shared database before scaling to multiple application instances.

Set these private hosting settings:

- `HELIO_PUBLIC_ORIGIN`: exact HTTPS site origin, with no trailing slash or path.
- `HELIO_TEAM_PASSWORD`: a random password of at least 16 characters.
- `HELIO_DATA_KEY`: a base64-encoded random 32-byte key; preserve it for the lifetime
  of the encrypted contacts. Changing it without migration makes old contacts unreadable.
- `HELIO_DB_PATH`: database path on the persistent disk, outside public files.
- `HOST=0.0.0.0` and the host's assigned `PORT`.

Build command: `npm ci --include=dev && npm run build`. Production start command: `npm run start:production` (uses the host’s environment variables). HTTPS must
terminate at your host/proxy; it must preserve the public Host header. The configured
origin is checked for API mutations, and off-origin requests are rejected. Cookies
are HttpOnly, SameSite=Strict, and Secure for HTTPS sites. The server serves only the
built pages and OCR assets, not source, environment files or database files.

Back up the SQLite database and encryption key privately using your host's backup
features. A simple file-copy backup requires stopping the server first to capture a
consistent database. Test restore on a separate instance. Tracker JSON exports omit
contact emails, vendor grants and sessions. Do not publish a database backup to GitHub.
Changing the password does not invalidate existing team sessions immediately; they
expire within eight hours. For incident response, stop the app and remove its team
sessions from the SQLite `sessions` table before restarting with a new password.

## What is automatic and what remains manual

Automatic: recording a consented referral, shared saves, stage timestamps, dashboard
polling, comparison calculations, and attention flags for recorded due/missing work.
Manual: checking real providers, sharing vendor links, reporting actual activity,
assigning a follow-up date, and confirming an installation happened. There is no
outbound email/SMS provider, background reminder delivery, billing system, individual
team accounts, or customer confirmation portal in this version.

Contact emails are AES-256-GCM encrypted in the database. Vendor tokens and session
identifiers are stored only as SHA-256 hashes. Login/public endpoints have basic
in-process rate limits; session/grant expiration is enforced server-side. Deployments
should use host-level abuse controls and maintain their own privacy/retention process.

Validation:

```sh
npm test
npm run test:shared
```

Tests use temporary databases and synthetic providers only. They cover consent,
authentication, contact protection, access scope, session/link expiry and revocation,
conflicting writes, persistence, and the real multi-browser automatic-update workflow.
