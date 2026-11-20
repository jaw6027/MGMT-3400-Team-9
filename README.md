# Helio Home — energy & solar advisor

A class-project prototype for a connected-home and solar business. Compare a household's current electricity use with a scenario combining efficiency upgrades and solar. Adjust costs, verified incentives, export rates, maintenance, and subscription fees to prepare a printable customer report.

## Run

Requires Python 3 to serve the application and Node.js 20+ to install, build, and test it. Pinned development dependencies supply the local OCR engine, English language data, and browser test runner. The committed standalone page supports manual entry without building; photo reading requires the full served app and generated OCR assets.

```sh
cd /workspace/MGMT-3400-Team-9
npm ci --include=dev --cache /tmp/helio-npm-cache
npm start
```

Open the served application on port 3000 using your development environment's supported browser access. Alternatively, open `index.html` directly in a browser or HTML preview: its styles and manual calculator code are bundled into the file. Photo reading additionally loads same-origin OCR modules, workers, WebAssembly, and language data from `vendor/ocr/`; a standalone file or restricted preview may not allow these. The UI then explains the limitation and permits manual correction. To serve without npm, use `python3 -m http.server 3000 --bind 0.0.0.0`.

### Editing

Edit the markup in `scripts/index.template.html`, the styles in `style.css`, the interface logic in `app.js`, the solar calculation model in `energy.js`, and the bill review model in `review.js`. Optional numeric persistence is managed by `progress.js`. The photo reader uses `bill-ocr.js`, its conservative text extraction rules live in `bill-parser.js`, and the confirmation dialog is managed by `bill-ui.js`. Run `npm run build` to regenerate the committed self-contained `index.html`. `npm start` also rebuilds automatically. The build copies integrity-verified npm assets into ignored `vendor/ocr/`; deploy that folder alongside `index.html` to enable photo reading. No public CDN or external OCR API is used at runtime. Commit both source edits and the regenerated page.

```sh
npm test
```

## Use

### Homeowner Energy Review

Enter usage (kWh) and bill costs (USD) for January–December of one year. All 24 values are needed before the review appears; zero is valid, but missing, negative, or invalid values do not count as complete. By default, entries exist only in memory and are lost on reload. Homeowners can explicitly choose **Save progress** to keep numeric progress on the same browser. **Try example data** replaces the entries with a labeled sample; **Clear bills** clears the review without changing the solar plan.

The review shows annual totals, average monthly usage and bills, total billed cost divided by total usage, a monthly usage chart, all tied highest-use and highest-cost months, and months more than 20% above average usage. Recommendations suggest things to investigate; monthly bills alone cannot diagnose appliance loads or establish causes. Billing-period length and weather can affect comparisons. Zero annual usage has no per-kWh rate and cannot be applied to solar sizing.

**Use average usage in solar plan** copies only average monthly kWh into the existing calculator. It preserves the variable electricity rate and all other assumptions: billed costs can include fixed fees and taxes, so their blended rate must not automatically become a solar savings rate. Editing or clearing bills does not silently overwrite the solar plan. **Print report** includes entered bills and the completed review along with the solar scenario. There is no utility-account connection or server upload. Optional local saving covers bill numbers, solar assumptions, sample-data labels, and separately opted-in questionnaire answers; bill photos are selected and read locally.

### Save progress on this browser

**Save progress** is an explicit, optional snapshot, not automatic saving. It stores monthly usage and cost values (including partially entered months), numeric solar settings, and labels identifying sample data in this browser's local storage. Blank fields remain blank and zero is preserved. Returning to the same app address in the same browser restores the snapshot and recalculates the review, comparison, and recommendation. A status message identifies restored data and unsaved edits; press Save progress again to update the saved copy.

Only whitelisted numeric fields, sample-data flags, and separately opted-in structured home answers are serialized under `helio-home:progress:v1`. Customer/project names, assessment contact details, notes, bill filenames, images, raw OCR text, and unconfirmed import drafts are excluded. Saved data is local, accessible to others using that browser, and not encrypted or synced to other devices. Browser data clearing or private browsing may remove it; restricted previews may block access. Read/write failures are explained without breaking the calculator or discarding on-screen work. Unsupported/corrupt records are not applied or automatically overwritten.

**Delete saved progress** removes only this app's saved snapshot, leaving current entries on screen and unrelated site storage untouched. It does not save again automatically. Clear bills and Reset change on-screen entries only; if a saved copy exists, the unsaved-changes message explains that the previous snapshot remains until explicitly replaced or deleted. The save controls are excluded from printed reports. Run `npm run test:progress` for browser checks covering restoration, partial entries, sample labels, deletion, privacy exclusions, and storage failures.

### Importing a bill photo

Choose **Choose bill photo** in Homeowner Energy Review. PNG, JPG, and WebP images up to 10 MB and 25 megapixels are supported; use a clear, upright English-language bill with US-style decimal amounts in USD. PDF and HEIC files are rejected. Reading happens locally in a web worker. There is a 90-second timeout and cancellation stops the job.

The reader proposes only a billing month, kWh usage, and total cost. Labeled bill/statement dates and explicit billing months are considered; due dates and service-period ranges are not guessed as billing months. Ambiguous numeric dates, multiple candidate values, missing labels, low reading confidence, and unreadable images leave fields blank with warnings. Global OCR confidence is not a field-level guarantee. Bills vary widely, so every value needs human review; total amount due may include prior balances rather than only current charges.

Correct the draft and check the review confirmation before adding it. Existing data in the selected month requires a separate replacement checkbox. Changing any extracted field resets the review confirmation; changing the destination resets replacement approval. Only that month's reviewed numeric values are copied into the table, and the existing reviews and recommendations update normally. Cancel or Escape discards the draft without changing the table. If OCR cannot run in a restricted preview, the dialog explicitly explains the problem and supports manual entry.

**Privacy:** no image, filename, OCR transcript, address, account number, or name is sent to a server, added to the DOM, placed in browser storage, or written to app logs. The file picker is cleared immediately, decoding to a canvas removes file metadata, OCR text is reduced to three fields and discarded, and the worker is terminated after each read. OCR language caching in IndexedDB is disabled. The browser may cache nonpersonal app assets. Closing the dialog clears the draft; the confirmed month, usage, and cost remain in the in-memory table. Only after the homeowner chooses Save progress can those confirmed numbers be stored on this browser; unconfirmed import drafts are excluded. Printed reports and explicitly downloaded assessment drafts can contain those confirmed numbers, but never the original image or its other text. Contact fields in the separate assessment request are manually provided, not copied from bills.

Run the repeatable real-image browser test with:

```sh
npm run test:ocr
```

It generates synthetic bills in memory, starts an ephemeral local test server, and verifies actual OCR, corrections, overwrite approval, unreadable images, unsupported/corrupt files, cancellation, mobile layout, and absence of uploads or browser storage. It uses `/usr/bin/chromium` if available, otherwise a Playwright-installed Chromium; set `CHROMIUM_PATH` to use another installation. All test data is fictional. No real bills are committed.

### Personalized recommendation and home assessment request

After all 12 months are entered, **A plan shaped around your home** explains a main opportunity, supporting bill patterns, and a suggested service package. Months more than 20% above average trigger a peak-use investigation and **Smart Efficiency Starter**; otherwise **Home Energy Essentials** focuses on recurring loads. These are prompts for an audit, not diagnoses. Zero recorded consumption gets **Bill & Meter Review**, not an equipment recommendation.

When the valid solar-only comparison shows positive ongoing savings and some solar used at home, the suggested package becomes **Efficiency + Solar Assessment**, while preserving the bill-based efficiency opportunity. This does not establish roof suitability, installation affordability, or payback. Missing, inconsistent, or unfavorable solar assumptions keep the recommendation focused on efficiency. Example bill data is labeled, and suggestions update when bills or solar inputs change.

**Request a Home Assessment** opens a local dialog for a name, email, optional postal code, and notes. **Download assessment request** creates a plain-text draft with contact details, bill data, the recommendation, and current solar assumptions. The homeowner must share it with their chosen provider. This prototype has no booking backend or email destination: nothing is sent, no appointment is booked, and no lead is stored. Closing the dialog clears its contact fields. The recommendation is also included in the printed report.

### Solar options for different usage situations

After a complete bill review, **Solar options for your usage** connects monthly patterns and optional home answers to steps to discuss with an assessor. Steady use prompts a grid-connected solar comparison; peak months prompt efficiency checks and monthly production matching before sizing. Reported daytime activity prompts a direct-use assessment, while overnight EV charging or daytime absence prompts comparison of scheduling, export credits, and optional storage. EV demand must not be counted twice. Time-of-use pricing needs interval-based analysis, and backup goals need compatible storage and backup controls.

Roof constraints or renting prompt feasibility checks and community solar where available. Existing solar requires generation and import/export records; zero use requires data verification. Unknown timing is left unknown. These suggestions update with bills and home answers, appear in print and downloaded assessment drafts, and do not change calculator inputs. They do not estimate battery or subscription economics, establish roof suitability, or infer hourly use from monthly totals. Confirm full costs and utility rules before choosing equipment.

### Solar savings scenario

The existing scenario uses its manually entered monthly usage. The **Current costs vs. solar** section instead uses annual kWh and actual bill totals directly from the completed Homeowner Energy Review, without requiring the usage-transfer button. It shows current annual/monthly costs, solar-only ongoing costs, and solar plus smart-upgrade ongoing costs. All assumptions and the cost breakdown are visible and included when printing.

The comparison assumes the entered bills are for a home without solar. It models current variable electricity charges as entered annual kWh × the solar plan's variable electricity rate, then holds the remaining bill charges constant in both solar cases. Estimated cost = grid imports × variable rate + retained charges − export credits + maintenance + monitoring. It does not assume every dollar on the current bill is avoidable. If the variable rate implies usage charges above the entire bill total, the comparison is hidden with a correction message. Zero annual usage also requires correction before comparing.

Solar-only assumes no efficiency improvement; the combined case uses the selected reduction. One-time installation costs, upgrades, incentives, and financing are not included in recurring annual costs. Inferred remaining charges are not a verified breakdown of fixed fees, taxes, minimum charges, or demand charges. Utility rules may change after installing solar. There is no hourly matching or export credit cap; negative estimates represent modeled net credits, not guaranteed cash payments. Inputs remain editable and the comparison updates automatically; incomplete bills or invalid solar inputs hide previous results.

1. Enter average monthly consumption and the variable electricity rate from customer bills.
2. Choose an assumed reduction from efficiency upgrades.
3. Enter solar size, local peak sun hours, system performance, self-consumption, and the utility's export rate.
4. Expand **Project costs & incentives** to enter actual quotes and verified incentives.
5. Review annual energy flows, savings, and simple payback; use **Print report** to print or save as PDF. **Reset** restores the sample household.

All values are illustrative, in USD, and editable. No incentives are assumed by default. Annual production uses size × peak sun hours × 365 × performance. Solar consumed at home is capped at post-upgrade annual demand; surplus receives the entered export rate. This annual model does not simulate hourly or seasonal matching, credit caps, batteries, equipment degradation, financing, fixed utility fees, or future rate changes. It is a planning aid, not a quote, engineering design, or guaranteed savings prediction. The app has no live device integrations and transmits no form data. Optional saving keeps numeric progress and separately opted-in coded home answers locally, excluding photos and contact details. Tesseract.js supplies local browser OCR. No external fonts, OCR APIs, or accounts are required; OCR code and language assets are served from the app itself.

## Customer help

**Need help?** in the header opens an accessible dialog with quick answers about bill entry, photo import, solar assumptions, assessment requests, and privacy. The supplied temporary phone number is explicitly labeled inactive demo data, and live chat is labeled **Coming soon**. No verified business phone line, agent availability, message submission, or AI integration is claimed. When contact details are available, replace those placeholders with the business's verified phone link or HTTPS chat destination in `scripts/index.template.html`, then rebuild. The help dialog does not change bill entries and is excluded from printed reports.

## Customer-friendly guidance

The **Start here** guide links to bill entry, cost comparison, and the personalized next step. It explains that one bill is enough to start and save, while the full review needs 12 months. Plain-language notes explain kWh, panel power in kW, electricity prices, assumed efficiency improvements, sunlight, system losses, solar used at home, and utility credits.

**Advanced solar settings** starts collapsed. Solar system size stays visible, and all numerical assumptions remain editable. Validation reveals any invalid setting inside a closed section, including a partially saved setting; printing expands advanced settings and project costs so assumptions remain visible.

The bill-based comparison includes **What this means for your home**, explaining entered annual bills, modeled solar-only savings or extra costs, the exclusion of installation and loan payments, and how efficiency improvements differ from solar replacing grid purchases. Example data remains explicitly labeled, unavailable comparisons hide the summary, and zero assumed efficiency does not claim a consumption reduction. Run `npm run test:guidance` for the browser checks. These changes have browser validation; they have not been evaluated in a study with actual homeowners.

## Home Energy Questionnaire and inspection help

**Tell us about your home** collects optional, structured home/household, heating/cooling, insulation/windows, appliance/lighting, EV/pool/spa, roof/existing-solar, tariff, climate, and planning details. Numeric questions can be left blank; choice fields include Not sure. Answered details are summarized, printed when supplied, and included in an explicitly downloaded assessment draft. No names, exact address, account numbers, or free-text notes are collected by this questionnaire. Answers are self-reported and do not replace an inspection.

The recommendation adds reported draft/insulation concerns, equipment age, hot-water loads, lighting, EV schedules, time-of-use pricing, comfort/backup priorities, and budget context where relevant. Roof, shade, permission, and electrical issues flag solar feasibility; they do not automatically change numerical production or savings assumptions. Existing solar hides the bill-based comparison because that model assumes a home without solar. Time-of-use and estimated-bill answers add visible comparison cautions. Unknown equipment, roof, and permission details remain follow-ups, not assumed facts.

Questionnaire answers remain in memory by default. **Also save my home questionnaire answers on this browser** is a separate opt-in beside Save progress. Only whitelisted numeric/coded choices are saved, and existing version-1 numeric-only snapshots still restore. Unchecking the option and saving removes the questionnaire from the saved copy. Delete saved progress still removes only this app's snapshot. Contact information and bill photos/text remain excluded.

**Request an inspection visit** works even without questionnaire answers or 12 months of bills. It opens the existing local request-draft form and includes whatever information is available, clearly marking missing totals. The supplied `661-111-111` is displayed as an inactive demo number; it is not a dialable contact link. No request is sent or appointment booked. A real reachable business number and/or booking service must be supplied before live scheduling is possible.

Run `npm run test:questionnaire` for browser checks covering unknown answers, recommendations, existing solar, inspection requests without bills, opt-in profile persistence, readable assessment exports, and mobile/print behavior.

## Showing customers low-, medium-, and high-use examples

The **See example homes** link near Start here opens an optional comparison inside the existing recommendation card. It is available without completing the bill table and does not modify any entries, settings, or saved progress. It shows 400/900/1,600 kWh monthly examples with illustrative 2/5/8 kW systems and average monthly electricity charges before and after solar. The figures come from the existing model with explicit fixed assumptions: $0.18/kWh, 4.5 peak sun hours/day, 80% performance, no efficiency savings, and no operating fees.

Every generated unit is assumed to offset electricity at the full retail rate. This is a simplified educational assumption, not established self-consumption or export compensation. The disclosure excludes fixed utility fees, maintenance, installation, loans, storage, and replacement costs; it identifies annual averages, rounding, and seasonal/hourly limitations. Example household labels are not classification thresholds or sizing advice. Customers can print the report with the example panel open to include the examples and their assumptions, or leave it closed to keep the report focused on their own data.

## Simplified customer journey

The default page presents three main cards: **1. Add your bills**, **2. Understand your results**, and **3. Request an inspection**. The inspection request stays visible and works without completed bills. The result view emphasizes current versus solar-only costs and the main recommendation; the preliminary-estimate limits, selected solar assumptions, and any roof/tariff cautions remain visible.

Save controls, monthly patterns, the complete solar scenario editor, efficiency comparisons, cost breakdowns, recommendation evidence/options, and the home questionnaire are available through labeled **More details** disclosures. Educational examples remain optional. None of the existing data fields, local OCR protections, calculations, saved-profile consent, or request-download behavior were removed. Local links open enclosing disclosures before navigating, and validation reveals nested invalid solar inputs. Printed and downloaded assessments retain detailed assumptions even when those panels are closed on screen. After printing, the original disclosure states are restored.

Run `npm run test:simplified` to check the three-step default, collapsed optional tools, results and visible limits, no-bill inspection, link navigation, nested validation, saving, complete print output, restored screen layout, and mobile overflow. Existing browser feature checks explicitly open the tools they exercise, while this test guards the collapsed default experience.

### Bakersfield referral finder

Step 3 includes a collapsed provider finder. It suggests assessment, rooftop solar,
existing-system review, storage, outage backup, or community-solar eligibility
services from the completed bill review and optional home answers. These are
consultations, not equipment sizes, quotes, savings promises, or endorsements.
Homeowners confirm their area; no exact address is required. Incomplete or zero-use
reviews offer an assessment first. Existing solar and rooftop constraints restrict
which services appear. Community solar is subject to actual local availability.

The production directory in `referral-vendors.js` is intentionally empty until the
group supplies checked public business details. No providers or contacts are invented.
Add records using this schema (values below describe fields, not a real listing):

```js
// { id: 'unique-id', name: 'Business legal/public name',
//   areas: ['bakersfield-ca'], services: ['assessment', 'solar'],
//   phone: 'verified public US phone', email: 'verified public email',
//   website: 'https://official-business-site' }
```

Supported service codes: `assessment`, `solar`, `maintenance`, `storage`, `backup`,
`community`. Include only services and coverage confirmed by the business. Generic
battery service does not establish outage-backup capability. At least one valid
public contact is required; missing or invalid contacts are omitted. Recheck details
before publishing and when vendors change. Listings are alphabetical, not ranked.
Rebuild with `npm run build` after editing the directory to update standalone
`index.html`. Contact links carry no homeowner or bill data. Nothing is submitted
or booked; inspection requests remain local files the homeowner chooses to share.

The finder also offers an explicitly unverified external Google Search for the
selected service in Bakersfield, including when the directory has no matches.
No homeowner data is included; the link is removed for unknown/unsupported areas.
Provider cards state that a written quote is needed; there is no invented
quality or affordability ranking. A collapsed price guide explains how to compare
2–3 equivalent quotes, full installed costs, financing totals, warranties and
remaining utility charges, with a link to California's CSLB license lookup.

### Team vendor performance tracker

Open `vendor-tracker.html` for the separate internal class-project tracker. It is
not linked from the customer journey and has no sign-in or shared database. Do not
use it as a secure production CRM. Add business names and anonymous referrals only;
there are no fields for homeowner contact details, bills, addresses or freeform notes.
Clicking a provider link on the customer website does not create a referral.

1. Add a vendor business name, referral date and stage. A random referral ID is
   generated. Use a consistent business name (case differences are grouped).
2. Edit that referral as it reaches first contact, a scheduled consultation,
   installation or closure without installation. Contacted/scheduled/installed
   stages require a first contact date; installed requires an installation date.
   These are manually reported facts, not confirmations from the vendor.
3. Set a next follow-up date and optionally record a customer-supplied 1–5 rating.
   Open follow-ups on or before today appear in the vendor's due count. Dates use
   the browser's local calendar day.
4. Review vendor totals, open/installed/closed counts, installation rate, average
   days to first contact, rating averages with sample counts, and follow-ups due.
   Installation rate divides installed by all referrals, including open ones.
   Contact averages exclude missing dates and ratings exclude missing scores.
   Differences in job type, referral age and sample size preclude a quality ranking.
5. Choose **Save on this device** explicitly; edits are not saved automatically.
   **Load device copy** restores that browser's snapshot. **Download backup** and
   **Import backup** transfer a versioned JSON snapshot. Import/load replaces the
   tab's records after confirmation when records exist; it does not merge concurrent
   work or save automatically. Coordinate one group copy to avoid lost updates.
   **Delete device copy** removes only this tracker's saved key and retains tab data.

Records never go to GitHub or a server through the tracker. Browser storage and
backup files are not encrypted by the app. Production team use would require
access control, a shared database, consent handling and an audit trail. This prototype
supports 1,000 records and validates imported dates, stages, ratings and unique IDs;
unknown fields are discarded. Run `npm run test:tracker` for the browser workflow,
and `npm test` for date validation, backup validation and metric calculations.
`npm run build` regenerates both standalone HTML pages from source.

The vendor performance page starts with a four-column per-vendor summary: vendor,
referrals received, customers contacted and projects completed. A contacted count
means a first contact date exists, regardless of later closure or installation.
A completed project is an Installed record with an installation date. Use one
record per homeowner/project/vendor and edit it as it progresses; the anonymous
tracker cannot independently deduplicate homeowners. Additional rates, ratings
and follow-up metrics remain in a collapsed “More performance details” panel.

#### Following each referral through the process

Optional fields now record the service requested, assigned team member code (up to
12 letters/digits/hyphens), planned consultation date, quote received date, next
action, closure date and a structured closure reason. There is also a **Quote
received** stage. Use **Edit** on the same referral as work progresses; this is a
current-state tracker, not a historical audit log. Unknown details remain **Not
recorded**. Closure fields require the Closed stage, quote dates require a first
contact date, actual events cannot be future dated, and an installation cannot
precede a recorded consultation or quote. A planned consultation may be future dated.

The referral table can show all records, open follow-ups due today or earlier, or
open records missing a next action/follow-up date. Vendor totals always include all
records, regardless of the table filter. Expand **Process details** on a referral
to see its service, team member, dates, next action and closure reason. The service
and action lists and structured reasons avoid adding freeform homeowner information.

The new optional fields round-trip through device saving and JSON backups. Existing
version 1 backups still load without invented dates or assignments. Sharing remains
manual and there is no automatic vendor confirmation, reminder delivery or team
sync. Save again after edits; loading/importing still replaces rather than merges.
