# Kern Solar Connect — project handoff

Updated November 22, 2026 (America/Los_Angeles). This describes the current implementation and supersedes older, chronological notes in README.md. This is a summary, not a word-for-word chat transcript. No passwords or secrets are included.

## Goal and scope

Build a website for MGMT 3400, Group 9: Kern Solar Connect helps Bakersfield residents understand their electricity usage, request a free phone or in-person consultation, and connect with solar installers. This is a classroom demonstration only. It does not book real appointments, install panels, submit leads, or promise savings.

Keep the customer website separate from staff tools. The staff demonstration includes prospect CRM, commissions, and marketing acquisition/spend tracking. Everyone on the four-person demo team has equal access.

## Start in another environment

Copy/extract the entire project, including untracked files. Open that folder in Codex and ask:

> Continue Kern Solar Connect from HANDOFF.md. Inspect the existing implementation before editing. Preserve the class-demo scope, separate customer/staff sites, and current design. Do not rebuild from scratch. Make the next requested change and verify it.

Requirements: Python 3 and Node.js with the built-in test runner. There is no npm dependency installation or framework build.

Run these in separate terminals from the project root:

```sh
python3 -m http.server 4173 --bind 127.0.0.1 --directory public
python3 -m http.server 4174 --bind 127.0.0.1 --directory staff-demo
```

Customer preview: http://127.0.0.1:4173/ . Staff preview: http://127.0.0.1:4174/ . Local preview servers must be restarted in the new environment; these URLs are not public hosting.

Rebuild generated translations, cache-versioned asset links, standalone HTML files, and ZIP:

```sh
python3 scripts/package_demo.py
```

## Completed customer website

- Responsive navy, warm yellow, and off-white design with original SVG illustration. Business tagline: “Local guidance. Brighter energy choices.”
- Hero yellow button: **Schedule Your Free Consultation Today**. Nearby instruction: “Complete the home energy usage worksheet first.” User requested the first letter of every word capitalized.
- Three step titles: **Get A Consultation**, **Explore Your Options**, **Start Saving**.
- Fictional installer showcase automatically scrolls left to right: Sunridge Solar, Valley Light Energy, Golden Hour Solar, Kern Horizon Solar. Partners are explicitly examples, not established relationships. Pause/Resume button was removed at the user's request. Hover/focus pauses; reduced-motion preference produces a static horizontal list.
- Home energy worksheet requires a home address (fictional for demo). Includes optional Own/Rent/Other and a textarea labeled **Additional Information**.
- All 12 months have electricity usage (kWh) and cost (USD) fields. At least one complete monthly usage/cost pair is required. Entire months may be blank; partially entered pairs are rejected. Nonnegative values, up to two decimal places. Blank months are not treated as zero.
- **View summary** shows totals only for entered months and flags missing months. Summary includes address, ownership, and additional information.
- **Request a consultation** after the summary unlocks the consultation form. Editing worksheet data invalidates the summary and locks the form until reviewed again.
- Phone and in-person options. In-person displays a required meeting-address field, prefilled from worksheet and editable. Phone hides/disables that field. Additional information prefills the consultation message unless the visitor has independently edited it.
- FAQ and final consultation section are at the bottom, above the footer. About remains on the customer page.
- English plus Spanish, Punjabi (Gurmukhi), Tagalog, Arabic (RTL), and Vietnamese. Translates visible copy, accessible labels, placeholders, months, validation, summaries, and confirmations. Language changes preserve current form values. Language preference alone persists in localStorage; query strings such as `?lang=es` work.

Current short worksheet instructions:

> Use electricity bills from the same year to enter monthly usage (kWh) and cost (USD).
>
> Enter at least one month and leave missing months blank. Then select View summary.

User preferences: simple wording, less filler and clutter, incremental changes. Removed the long energy education section, long preparation checklist/sidebar, value strip (“Local perspective,” etc.), and “You don’t need to have solar figured out…” reassurance. Do not restore those sections without being asked.

## Completed staff dashboard

Separate source directory and preview port. Sign-in is simulated by choosing Group 9 team member 1–4; there is no password or real authorization. Five fictional prospect records. All staff edits are in memory and reset on refresh, sign-out, or reset. Nothing syncs across devices.

Three separate views keep the interface uncluttered:

- **Overview (`#overview`)**: global financial metrics and salesperson rollup; totals ignore prospect filters. Default staff view.
- **Sales (`#sales`)**: create/edit prospect, filters, pipeline, individual records and history. Team financial overview stays separate.
- **Marketing (`#marketing`)**: acquisition, campaigns, spend, lead sources, and loss analysis.

CRM capabilities:

- Create/edit prospect contact details; require email or phone; prevent duplicate email/normalized phone. Consultation type and meeting address, salesperson, acquisition date, lead source/detail and campaign assignment.
- Pipeline: New lead, Contacted, Consultation scheduled, Referred to installer, Installation in progress, Closed won, Closed lost. Consultation status is separate. Lost stage requires a reason.
- Follow-up dates with overdue/today/upcoming/no-date indicators, next action, optional appointment time (Bakersfield time), contact preference and availability. No actual reminders/calendar bookings.
- Known-information fields for ownership, home/household size, utility/rate, heating/cooling/water heating, EV/pool, existing solar, roof/shade, goals, timing, decision-makers, and notes. Read-before-contacting recap and contact history help avoid repeating questions.
- Contact history with date, method, outcome, summary, next action, and team identity. Internal notes and progress logs.
- Installer referral company/contact/email/phone/date/status/notes. Recording a referral does not send a message or automatically change stage.
- Commission payer, earning milestone, earned date, payment due date, overdue outstanding amounts, and an editable received-payment ledger (date/payer/amount/reference/note). Duplicate payer/reference and overpayment checks. Editing a payment replaces it rather than counting it twice.

Commission definitions (cent-based arithmetic):

- Earned includes amounts already paid.
- Awaiting payment = earned minus received.
- Open pipeline estimate = sum of `max(expected commission - earned commission, 0)` for deals excluding Closed won/lost.
- Potential future receipts = open pipeline estimate + earned awaiting payment.
- Changing a stage never automatically earns or pays commission. Closed deals retain historical actual earnings/payments.
- Reference seed totals: **3 open deals; $4,700 open estimate; $2,000 earned; $750 received; $1,250 awaiting payment; $5,950 potential future receipts**. Fictional USD.

Marketing capabilities:

- Four fictional campaigns with source/channel, status, owner, dates, lifetime budget, and tactics. Assigning a campaign sets the prospect's source/channel; campaign channel edits update assigned prospects.
- Dated expense ledger with add/edit. Actual spend is separate from budget. Remaining budget/overspend uses lifetime actual expenses.
- Unique prospect count based on acquisition date and one assigned campaign per prospect; unassigned/organic leads shown separately.
- Inclusive date filters default to Bakersfield month-to-date. Period spend uses expense dates. Cost per lead = period spend / period acquired prospects; no prospects shows a dash.
- Previous equal-length period comparison (not for All time). All-history source/won/lost and loss-reason summaries explicitly ignore date filters.
- Campaign detail can open an associated prospect in Sales. No ad-platform connection.
- Seed dates are relative to the current date, so displayed reporting totals can change over time.

## Files created/changed across this project

Because there are no commits, Git cannot provide a historical per-change diff. All project files are currently untracked.

| Path | Purpose |
| --- | --- |
| `public/index.html`, `public/styles.css` | Customer structure and responsive presentation |
| `public/app.js` | Worksheet, summary, consultation gate and form behavior |
| `public/i18n.js` | Translation switching and localized UI behavior |
| `public/translations.js` | Generated language catalogs; edit source TSV/JSON instead |
| `public/installers.js` | Installer scrolling and reduced-motion behavior |
| `staff-demo/index.html`, `staff-demo/staff.css` | Staff sign-in and separate Overview/Sales/Marketing views |
| `staff-demo/crm.js` | Pure commission/validation helpers and shared lists |
| `staff-demo/staff.js` | Seed prospects, pipeline, metrics, selection, reset/sign-in |
| `staff-demo/prospects.js` | Prospect editor, discovery/contact/referral/payment records |
| `staff-demo/campaign-math.js` | Pure campaign dates, counts, and spend calculations |
| `staff-demo/marketing.js` | Campaign UI, expense ledger, acquisition reporting, view routing |
| `scripts/customer-copy.json` | Indexed English copy source |
| `scripts/customer-translations.tsv` | Indexed Spanish/Punjabi/Tagalog/Arabic/Vietnamese translations |
| `scripts/customer-attributes.tsv` | Attribute and additional static-copy translations |
| `scripts/customer-ui.tsv` | Dynamic UI translation keys and messages |
| `scripts/build_customer_languages.py` | Validates coverage and builds translation catalogs |
| `scripts/package_demo.py` | Regenerates catalogs, versions asset URLs by hash, builds standalone files and ZIP |
| `tests/crm.test.cjs` | Commission and validation tests |
| `tests/campaigns.test.cjs` | Campaign math/date tests |
| `tests/languages.test.cjs` | Language coverage and dynamic-message tests |
| `.openai/hosting.json` | Static root configured as `public`; no project ID/deployment |
| `README.md` | Detailed chronological project notes; some earlier descriptions are outdated |
| `HANDOFF.md` | This current-state handoff |
| `Kern Solar Connect.html` | Generated standalone customer demo |
| `Staff Dashboard Demo.html` | Generated standalone staff demo |
| `Kern Solar Connect.zip` | Generated combined handover archive with sources/tests/docs/standalone files |

Keep staff files outside the public static root. The combined ZIP is for project handover, not a directory to publish wholesale.

## Git / GitHub status

Verified November 22, 2026:

- Local branch: **master** (unborn; no commits).
- **No GitHub remote**, push, pull request, or commit SHA exists.
- All project directories and deliverables are untracked. This handoff and its packaging adjustment are also uncommitted.
- No branch/commit was created for the handoff request. Copy the actual project files/ZIP to transfer the work; an empty repository's history will not carry them.

## Verification

Rerun during this handoff: **all 12 tests passed**.

```sh
node --test tests/crm.test.cjs tests/campaigns.test.cjs tests/languages.test.cjs
```

Coverage: six CRM tests (commission separation/no double counting, nonnegative forecast, closed-deal earnings, amounts/overpayment, payment replacement, lost reason); four campaign tests (date attribution/boundaries, all-time/no leads, previous period/leap day, budget/date validation); two language tests (all six catalogs/message placeholders, months/fields/warnings).

JavaScript syntax checks also passed for every `public/*.js` and `staff-demo/*.js` file using `node --check`.

Earlier interactive browser checks covered customer worksheet/summary/consultation flow, in-person address, language switching, staff CRM/views, and the latest Title Case hero button. There is no saved automated browser end-to-end suite. Packaging is rebuilt for this handoff, with ZIP contents checked for HANDOFF.md.

## Known limitations / issues

- Demo sign-in is not security. A real private staff dashboard requires server-side authentication/authorization and protected data access.
- No backend, persistence for prospect/customer data, email/SMS, actual bookings, real installer referral integration, or shared multi-user database.
- Worksheet/contact forms do not submit or save data. Use fictional details; no real addresses/account/payment data or uploaded bills.
- No public deployment/domain. An earlier Sites attempt reported that Sites was not enabled for this workspace; no deployment was created.
- Translations are drafts, not professionally reviewed. The chosen five additional languages are regional-access examples, not a verified exact ranking of all Bakersfield speakers. No multilingual staff availability is promised.
- English copy array and TSV row IDs must stay aligned. Do not reorder source entries blindly. Some removed copy and unused CSS remain in sources.
- Minor copy inconsistency: worksheet field says “Additional Information”; summary still uses “Additional information / goals.”
- README contains older chronological descriptions; prefer this handoff and current source when they conflict.
- No unresolved functional failure was observed in the current checks; automated tests do not cover every UI interaction.

## Next steps

1. Open the copied project, run both previews, and confirm current screens before making the user's next requested edit. All requested feature changes preceding this handoff were completed.
2. Keep source edits in `public/` or `staff-demo/`; update translation sources for customer copy, then run packaging and relevant tests. Generated standalone HTML should not be the primary editing target.
3. Refresh the preview after changes. Asset content-hash URLs were added to prevent stale CSS/JS.
4. If the user wants version control/GitHub, establish an initial commit and appropriate remote as a separate requested step; none exists yet.
5. If requested, consolidate README, align the additional-information summary label, and remove unused copy/styles carefully. These are optional cleanup, not blockers.
6. Only expand to production hosting, real login, database, notifications, or integrations if requested. Preserve the classroom demo and fictional-data scope in the meantime.

## Chat history transfer

Codex's available fork-chat capability retains task history in another Codex chat. A fork and a project/environment transfer are different operations: this folder's untracked files and local servers still need to be carried over/restarted. No fork was created by this handoff request.

This document and ZIP do not include a verbatim transcript. A summary cannot reconstruct a word-for-word archive. A dedicated full Codex desktop transcript export has not been verified here. ChatGPT's account data export is a separate feature and should not be assumed to export Codex desktop chats or restore them as native chats.
