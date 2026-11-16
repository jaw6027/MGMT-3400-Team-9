# Helio Home — energy & solar advisor

A class-project prototype for a connected-home and solar business. Compare a household's current electricity use with a scenario combining efficiency upgrades and solar. Adjust costs, verified incentives, export rates, maintenance, and subscription fees to prepare a printable customer report.

## Run

Requires Python 3 to serve the application and Node.js 18+ to build and test it; there are no package dependencies to install. The committed standalone page can also be opened without building.

```sh
cd /workspace/MGMT-3400-Team-9
npm start
```

Open the served application on port 3000 using your development environment's supported browser access. Alternatively, open `index.html` directly in a browser or HTML preview: its styles and calculator code are bundled into the file, so no neighboring assets or JavaScript module loading are needed. To serve without npm, use `python3 -m http.server 3000 --bind 0.0.0.0`.

### Editing

Edit the markup in `scripts/index.template.html`, the styles in `style.css`, the interface logic in `app.js`, the solar calculation model in `energy.js`, and the bill review model in `review.js`. Run `npm run build` to regenerate the committed self-contained `index.html`. `npm start` also rebuilds automatically. Commit both source edits and the regenerated page.

```sh
npm test
```

## Use

### Homeowner Energy Review

Enter usage (kWh) and bill costs (USD) for January–December of one year. All 24 values are needed before the review appears; zero is valid, but missing, negative, or invalid values do not count as complete. Entries exist only in memory and are lost on reload. **Try example data** replaces the entries with a labeled sample; **Clear bills** clears the review without changing the solar plan.

The review shows annual totals, average monthly usage and bills, total billed cost divided by total usage, a monthly usage chart, all tied highest-use and highest-cost months, and months more than 20% above average usage. Recommendations suggest things to investigate; monthly bills alone cannot diagnose appliance loads or establish causes. Billing-period length and weather can affect comparisons. Zero annual usage has no per-kWh rate and cannot be applied to solar sizing.

**Use average usage in solar plan** copies only average monthly kWh into the existing calculator. It preserves the variable electricity rate and all other assumptions: billed costs can include fixed fees and taxes, so their blended rate must not automatically become a solar savings rate. Editing or clearing bills does not silently overwrite the solar plan. **Print report** includes entered bills and the completed review along with the solar scenario. No utility connection, upload, or customer data storage is implemented.

### Solar savings scenario

The existing scenario uses its manually entered monthly usage. The **Current costs vs. solar** section instead uses annual kWh and actual bill totals directly from the completed Homeowner Energy Review, without requiring the usage-transfer button. It shows current annual/monthly costs, solar-only ongoing costs, and solar plus smart-upgrade ongoing costs. All assumptions and the cost breakdown are visible and included when printing.

The comparison assumes the entered bills are for a home without solar. It models current variable electricity charges as entered annual kWh × the solar plan's variable electricity rate, then holds the remaining bill charges constant in both solar cases. Estimated cost = grid imports × variable rate + retained charges − export credits + maintenance + monitoring. It does not assume every dollar on the current bill is avoidable. If the variable rate implies usage charges above the entire bill total, the comparison is hidden with a correction message. Zero annual usage also requires correction before comparing.

Solar-only assumes no efficiency improvement; the combined case uses the selected reduction. One-time installation costs, upgrades, incentives, and financing are not included in recurring annual costs. Inferred remaining charges are not a verified breakdown of fixed fees, taxes, minimum charges, or demand charges. Utility rules may change after installing solar. There is no hourly matching or export credit cap; negative estimates represent modeled net credits, not guaranteed cash payments. Inputs remain editable and the comparison updates automatically; incomplete bills or invalid solar inputs hide previous results.

1. Enter average monthly consumption and the variable electricity rate from customer bills.
2. Choose an assumed reduction from efficiency upgrades.
3. Enter solar size, local peak sun hours, system performance, self-consumption, and the utility's export rate.
4. Expand **Project costs & incentives** to enter actual quotes and verified incentives.
5. Review annual energy flows, savings, and simple payback; use **Print report** to print or save as PDF. **Reset** restores the sample household.

All values are illustrative, in USD, and editable. No incentives are assumed by default. Annual production uses size × peak sun hours × 365 × performance. Solar consumed at home is capped at post-upgrade annual demand; surplus receives the entered export rate. This annual model does not simulate hourly or seasonal matching, credit caps, batteries, equipment degradation, financing, fixed utility fees, or future rate changes. It is a planning aid, not a quote, engineering design, or guaranteed savings prediction. The app has no live device integrations and does not store or transmit form data. No external libraries, fonts, APIs, or accounts are required.
