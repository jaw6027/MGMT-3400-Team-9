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

**Use average usage in solar plan** copies only average monthly kWh into the existing calculator. It preserves the variable electricity rate and all other assumptions: billed costs can include fixed fees and taxes, so their blended rate must not automatically become a solar savings rate. Editing or clearing bills does not silently overwrite the solar plan. **Print report** includes entered bills and the completed review along with the solar scenario. There is no utility-account connection or server upload. Optional local saving is limited to bill numbers, solar assumptions, and sample-data labels; bill photos are selected and read locally.

### Save progress on this browser

**Save progress** is an explicit, optional snapshot, not automatic saving. It stores monthly usage and cost values (including partially entered months), numeric solar settings, and labels identifying sample data in this browser's local storage. Blank fields remain blank and zero is preserved. Returning to the same app address in the same browser restores the snapshot and recalculates the review, comparison, and recommendation. A status message identifies restored data and unsaved edits; press Save progress again to update the saved copy.

Only whitelisted numeric fields and sample-data flags are serialized under `helio-home:progress:v1`. Customer/project names, assessment contact details, notes, bill filenames, images, raw OCR text, and unconfirmed import drafts are excluded. Saved data is local, accessible to others using that browser, and not encrypted or synced to other devices. Browser data clearing or private browsing may remove it; restricted previews may block access. Read/write failures are explained without breaking the calculator or discarding on-screen work. Unsupported/corrupt records are not applied or automatically overwritten.

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

### Solar savings scenario

The existing scenario uses its manually entered monthly usage. The **Current costs vs. solar** section instead uses annual kWh and actual bill totals directly from the completed Homeowner Energy Review, without requiring the usage-transfer button. It shows current annual/monthly costs, solar-only ongoing costs, and solar plus smart-upgrade ongoing costs. All assumptions and the cost breakdown are visible and included when printing.

The comparison assumes the entered bills are for a home without solar. It models current variable electricity charges as entered annual kWh × the solar plan's variable electricity rate, then holds the remaining bill charges constant in both solar cases. Estimated cost = grid imports × variable rate + retained charges − export credits + maintenance + monitoring. It does not assume every dollar on the current bill is avoidable. If the variable rate implies usage charges above the entire bill total, the comparison is hidden with a correction message. Zero annual usage also requires correction before comparing.

Solar-only assumes no efficiency improvement; the combined case uses the selected reduction. One-time installation costs, upgrades, incentives, and financing are not included in recurring annual costs. Inferred remaining charges are not a verified breakdown of fixed fees, taxes, minimum charges, or demand charges. Utility rules may change after installing solar. There is no hourly matching or export credit cap; negative estimates represent modeled net credits, not guaranteed cash payments. Inputs remain editable and the comparison updates automatically; incomplete bills or invalid solar inputs hide previous results.

1. Enter average monthly consumption and the variable electricity rate from customer bills.
2. Choose an assumed reduction from efficiency upgrades.
3. Enter solar size, local peak sun hours, system performance, self-consumption, and the utility's export rate.
4. Expand **Project costs & incentives** to enter actual quotes and verified incentives.
5. Review annual energy flows, savings, and simple payback; use **Print report** to print or save as PDF. **Reset** restores the sample household.

All values are illustrative, in USD, and editable. No incentives are assumed by default. Annual production uses size × peak sun hours × 365 × performance. Solar consumed at home is capped at post-upgrade annual demand; surplus receives the entered export rate. This annual model does not simulate hourly or seasonal matching, credit caps, batteries, equipment degradation, financing, fixed utility fees, or future rate changes. It is a planning aid, not a quote, engineering design, or guaranteed savings prediction. The app has no live device integrations and transmits no form data. Optional saving stores only numeric progress locally, excluding photos and contact details. Tesseract.js supplies local browser OCR. No external fonts, OCR APIs, or accounts are required; OCR code and language assets are served from the app itself.

## Customer help

**Need help?** in the header opens an accessible dialog with quick answers about bill entry, photo import, solar assumptions, assessment requests, and privacy. Phone and live chat are explicitly labeled **Coming soon** because no verified business phone number or chat service has been supplied. There is no fake phone number, agent availability claim, message submission, or AI integration. When contact details are available, replace those placeholders with the business's verified phone link or HTTPS chat destination in `scripts/index.template.html`, then rebuild. The help dialog does not change bill entries and is excluded from printed reports.

## Customer-friendly guidance

The **Start here** guide links to bill entry, cost comparison, and the personalized next step. It explains that one bill is enough to start and save, while the full review needs 12 months. Plain-language notes explain kWh, panel power in kW, electricity prices, assumed efficiency improvements, sunlight, system losses, solar used at home, and utility credits.

**Advanced solar settings** starts collapsed. Solar system size stays visible, and all numerical assumptions remain editable. Validation reveals any invalid setting inside a closed section, including a partially saved setting; printing expands advanced settings and project costs so assumptions remain visible.

The bill-based comparison includes **What this means for your home**, explaining entered annual bills, modeled solar-only savings or extra costs, the exclusion of installation and loan payments, and how efficiency improvements differ from solar replacing grid purchases. Example data remains explicitly labeled, unavailable comparisons hide the summary, and zero assumed efficiency does not claim a consumption reduction. Run `npm run test:guidance` for the browser checks. These changes have browser validation; they have not been evaluated in a study with actual homeowners.
