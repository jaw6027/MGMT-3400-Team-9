# Helio Home — energy & solar advisor

A class-project prototype for a connected-home and solar business. Compare a household's current electricity use with a scenario combining efficiency upgrades and solar. Adjust costs, verified incentives, export rates, maintenance, and subscription fees to prepare a printable customer report.

## Run

Requires Python 3 to serve the application. Node.js 18+ is used only for tests; there are no package dependencies to install.

```sh
cd /workspace/MGMT-3400-Team-9
npm start
```

Open the served application on port 3000 using your development environment's supported browser access. JavaScript modules require HTTP; opening `index.html` directly as a file is unsupported. To run without npm, use `python3 -m http.server 3000 --bind 0.0.0.0`.

```sh
npm test
```

## Use

1. Enter average monthly consumption and the variable electricity rate from customer bills.
2. Choose an assumed reduction from efficiency upgrades.
3. Enter solar size, local peak sun hours, system performance, self-consumption, and the utility's export rate.
4. Expand **Project costs & incentives** to enter actual quotes and verified incentives.
5. Review annual energy flows, savings, and simple payback; use **Print report** to print or save as PDF. **Reset** restores the sample household.

All values are illustrative, in USD, and editable. No incentives are assumed by default. Annual production uses size × peak sun hours × 365 × performance. Solar consumed at home is capped at post-upgrade annual demand; surplus receives the entered export rate. This annual model does not simulate hourly or seasonal matching, credit caps, batteries, equipment degradation, financing, fixed utility fees, or future rate changes. It is a planning aid, not a quote, engineering design, or guaranteed savings prediction. The app has no live device integrations and does not store or transmit form data. No external libraries, fonts, APIs, or accounts are required.
