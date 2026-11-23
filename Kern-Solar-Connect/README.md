# Kern Solar Connect

A responsive, single-page MGMT 3400 class demonstration for Group 9. Built with HTML, CSS, JavaScript, and original SVG artwork.

Open `public/index.html` in a browser or run `python3 -m http.server 4173 --directory public` and visit http://localhost:4173.

The consultation form validates sample inputs and displays a demo confirmation. It does not send, store, or book requests. Use fictional details. Fonts load from Google Fonts, with local sans-serif fallbacks. No installer partnerships or specific savings are claimed.

The customer preparation section provides a consultation checklist and energy worksheet. The earlier educational energy-use cards and external-resource block have been removed. The required home energy usage worksheet has usage (kWh) and cost (USD) fields for January through December. Enter at least one complete month; unavailable months can remain blank. View summary calculates totals for entered months and flags each missing month. Blank values are not treated as zero. Each entered month must include both usage and cost; nonnegative values with up to two decimal places are accepted, including zero.

The summary's Request a consultation button unlocks the phone/in-person request form. Editing or clearing the worksheet invalidates the summary and locks that form again until a fresh summary is reviewed. No worksheet or contact details are transmitted or persisted. Refresh clears all entries. Use fictional information for the classroom demo.

## Separate staff dashboard demo

`staff-demo/` is separate from the customer site's `public/` directory and is not included in its static hosting configuration. Preview it with `python3 -m http.server 4174 --bind 127.0.0.1 --directory staff-demo` and visit http://127.0.0.1:4174. The customer site remains at port 4173; neither preview is publicly hosted.

Select a fictional team identity and click **Sign in to demo**. All identities have the same access. This is an explicitly simulated sign-in, not authentication or access protection. Do not use real customer records or deploy the staff demo as a private system. Live use would require server-enforced authentication and authorization, an approved staff list, and protected storage/API endpoints.

Staff tools include five fictional prospects, name/ID search, filters for consultation status, pipeline stage, salesperson, and follow-up timing, worksheet totals and missing-month flags, and internal notes attributed to the selected team identity. Records are not connected to public customer submissions. Changes are in memory only and reset on reload or sign-out. **Reset demo data** restores the sample records. Standalone customer and staff HTML files are provided separately for class presentations.

## CRM progress and commissions

Each prospect has an editable pipeline stage (New lead → Contacted → Consultation scheduled → Referred to installer → Installation in progress → Closed won / Closed lost), assigned salesperson or Unassigned, next follow-up date, estimated total commission, earned commission to date, and a read-only paid/received total calculated from the payment ledger. Save prospect updates recalculates the overview and salesperson totals and records the changes, team identity, and timestamp in the prospect's progress history. Consultation status is separate from sales stage. Follow-ups use Bakersfield's America/Los_Angeles calendar date, with overdue, due today, upcoming, and no-date filters. Dates are tracked in the dashboard; no reminders are sent.

Commission estimates and earned amounts are fictional USD entered manually; received amounts come from individual ledger payments; no real commission rates are implied. Values are stored as integer cents. Earned includes amounts already paid. Received cannot exceed earned. Earned awaiting payment = earned − received. Open pipeline estimate = sum of max(estimated − earned, 0) for active deals only; closed won and lost deals contribute no unearned forecast. Potential future receipts = open pipeline estimate + earned awaiting payment. This avoids counting already-earned amounts twice. Changing stage does not automatically change earned or received amounts. Historical earnings and payments remain included even if a deal is later closed lost. Overview and salesperson totals cover all records regardless of list filters.

Run `node --test tests/crm.test.cjs` for commission calculation and validation checks. Run `python3 scripts/package_demo.py` to rebuild both standalone HTML files and the ZIP, keeping CRM scripts bundled in the correct order.


## Prospect management and shared knowledge

Use **Create prospect** or **Edit prospect** to manage fictional names, email/phone, consultation preferences, in-person meeting addresses, questions, and lead sources/campaign details. At least one contact method is required. Duplicate email or phone matches are rejected to avoid duplicate outreach. New prospects start with an empty worksheet, clearly flagged as missing rather than invented usage.

**Known information** records ownership, approximate home and household size, utility and rate plan, heating/cooling and water-heating details, EV/pool/other loads, existing solar, roof/shade concerns, goals, timeline, decision-makers, preferred contact method/time, next action, optional consultation appointment, and other answered questions. Blank fields mean not yet asked/unknown. This section records the latest reviewer. Conversation history captures contact date, method, outcome, summary, and agreed next step. A shared recap shows the latest contact by contact date and the current next action before another call. Appointment times are recorded in Bakersfield time only; no calendar bookings or reminders are sent.

**Installer referral** tracks company, contact, email/phone, referred date, status, and response notes. Saving updates does not send referrals or automatically advance pipeline stages.

**Commission details & payments** records the payer, earning milestone/terms, date earned, and expected payment date. Overdue outstanding payments are flagged. Add or edit individual payments with received date, payer, amount, reference, and note. Received amounts are summed from the ledger; edits replace the original payment. Overpayments and duplicate payer/reference combinations are rejected. Ledger changes update team and salesperson totals and enter progress history.

Lead-source counts and won/lost outcomes, plus aggregated lost reasons, appear in **What’s working—and what to improve**. Closed-lost deals require a reason; optional details preserve the context. Filters include lead source. All tools are still fictional, in-memory classroom demonstrations with equal access and simulated sign-in.


## Customer website languages

The public customer site supports English plus Spanish, Punjabi (Gurmukhi), Tagalog, Arabic, and Vietnamese. These five additions prioritize the languages with the highest limited-English speaker counts in the Bakersfield metro language profile from Americans Against Language Barriers, based on ACS 2020–2024 PUMS: https://languages.aalb.org/metro/bakersfield-ca. This is a regional access-oriented selection, not a definitive city-level ranking of all speakers.

The header language selector changes page copy, month names and accessible labels, form placeholders, worksheet errors, missing-month flags, summaries, and demo confirmations. Language changes preserve entered values and the reviewed worksheet state. Arabic sets right-to-left direction. Numbers and USD totals are formatted by locale; worksheet entry uses a decimal point as stated in the on-page hint. Native required-field and email validation messages follow the selected website language.

Only the language preference is stored locally, when storage is available. Bill/contact entries are still in memory and clear on reload. Direct links support `?lang=es`, `?lang=pa`, `?lang=tl`, `?lang=ar`, and `?lang=vi`; unrecognized values fall back to English. The staff dashboard remains separate and in English. Website translation does not imply that consultations are available in every language.

Translation drafts are bundled with the class demo; no runtime translation service receives visitor data. They have not been reviewed by professional/native-language reviewers. External EIA and ENERGY STAR pages retain their own languages.

Translation sources are `scripts/customer-copy.json` (original text), `scripts/customer-translations.tsv` (Spanish, Punjabi, Tagalog, Arabic, Vietnamese), `scripts/customer-attributes.tsv`, and `scripts/customer-ui.tsv`. Run `python3 scripts/build_customer_languages.py` to rebuild `public/translations.js`; packaging runs this automatically. Run `node --test tests/languages.test.cjs` to check catalog coverage and message placeholders.


## Homepage installer showcase

A left-to-right scrolling installer showcase appears below the hero and value strip. Its four company names and monogram marks are fictional classroom examples, clearly labeled on the page; they do not represent partnerships or endorsements. Replace them with approved real company names/logos only if actual partnerships are established.

The showcase scrolls automatically without a Pause/Resume button. Hovering or focusing the rail temporarily pauses motion. Reduced-motion visitors receive a static, horizontally scrollable list with duplicate visual cards hidden. The duplicated animated group is hidden from assistive technology to avoid reading the same list twice. No company cards link to external services.


## Separate Marketing & Campaigns staff page

After demo sign-in, use **Sales CRM** or **Marketing & Campaigns** in the team navigation. The screens are separate views (`#sales` and `#marketing`) in the same staff demo, so switching pages preserves the in-memory records. The customer website does not contain this staff information. Lead-source and lost-reason insights now live on Marketing & Campaigns instead of Sales CRM.

Marketing supports creating/editing campaigns with a name, acquisition channel, status, team owner, start/end dates, total planned budget, and description of how the team finds prospects. A dated expense log records or edits actual campaign spend. Editing an expense replaces that entry; budget is not counted as actual spend. Campaign details show lifetime spend, remaining budget or overspend, and linked prospect records. A prospect can belong to at most one campaign, selected through Create/Edit prospect, with a required first-acquired date. A selected campaign controls the prospect's source/channel so attribution stays consistent. An unlinked prospect can still have a source and is reported as unattributed/organic.

The reporting date range is inclusive and defaults to the current Bakersfield calendar month through today. New prospects are counted by acquired date; spending is counted by expense date. Campaign cost per prospect = period spend / period acquired prospects; zero prospects displays a dash rather than implying free acquisition. Prospect growth compares counts with the immediately preceding equal-length period when both range dates are present. All-time reporting has no prior-period comparison. Unattributed prospects are shown separately and are excluded from campaign counts and acquisition-cost calculations. These figures do not claim profit or causal advertising attribution. Source/outcome and lost-reason summaries remain explicitly all-history rather than date-filtered.

Demo campaign budgets, expenses, and acquisitions are fictional and are not connected to advertising platforms. All team members have equal access; sign-in remains simulated. Global Reset demo data, refresh, or sign-out restores the original demo records. Run `node --test tests/campaigns.test.cjs` for period, spend, acquisition-cost, budget, and date-comparison checks.


## Staff Overview page

Staff navigation now separates **Overview** (`#overview`), **Sales CRM** (`#sales`), and **Marketing & Campaigns** (`#marketing`). Overview contains the six pipeline/commission total cards, their explanation, and the salesperson summary table. Sales CRM contains Create/Edit prospect, pipeline filters, and individual prospect records, with no team-level metric cards or salesperson table. Marketing keeps campaign acquisition and spending reports. Switching views preserves current demo data; Overview totals still update from Sales CRM records. Sign-in defaults to Overview unless the URL selects another staff view.


The customer homepage no longer includes the four-item value strip or the “You don’t need to have solar figured out” reassurance paragraph. FAQs and the consultation section are grouped at the end of main content, followed by the site footer. The installer showcase, how-it-works steps, preparation checklist, energy worksheet, and About section remain above them.


The yellow homepage button reads **Schedule your free consultation today**, with **Complete the home energy usage worksheet first.** immediately below. The required worksheet home address appears in its summary and pre-fills the editable in-person consultation address. Use fictional addresses for the demo. Changing the worksheet address invalidates the old summary, like any worksheet edit. All new labels and validation messages support the six customer languages. Packaged HTML uses content-versioned local assets to avoid showing stale scripts/styles after updates.


The customer worksheet includes optional Own/Rent/Other and Additional information / goals fields. Both appear in the reviewed summary, with blank answers marked Not provided in the selected language. Goals pre-fill the consultation question box without overwriting a separately edited message. Editing either worksheet field requires a new summary. These entries remain demo-only, are not sent or saved, and reset with the worksheet.


The long customer preparation checklist has been removed. The energy worksheet is now a single centered form with two short instructions: use same-year electricity bills for monthly kWh/USD, and enter at least one month while leaving missing months blank before viewing the summary. The demo notice and address helper are shortened. Navigation and FAQ wording now refer directly to the worksheet. Existing address, ownership, goals, monthly entries, summary, and consultation functionality remain in place.
