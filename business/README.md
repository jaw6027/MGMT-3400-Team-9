# Venture economics workbook

Open **Helio_Home_Venture_Economics.xlsx** in Excel. Make a working copy before
replacing the practice assumptions with your group's information.

- **Start Here:** instructions, expected-case summary, and modeling limits.
- **Assumptions:** blue editable inputs, cost breakdowns, contribution per referral,
  monthly operating profit, and recurring-cost break-even.
- **Monthly Plan:** 12 flat months linked to the inputs, startup costs in month 1,
  cash balances, annual totals, and a cash-balance chart.
- **Scenarios:** editable low/high cases, an expected case linked to Assumptions,
  break-even checks, and a monthly-profit comparison chart.

All starting values are practice assumptions. The revenue model assumes a fee paid
for completed installations. It does not establish actual vendor fees, eligibility,
referral-fee legality or market demand. Homeowner electricity savings are not business
revenue. Fees and expenses are modeled in the same month, so payment delays and
working-capital needs require additional analysis. Expected projects can be fractional.
Owner/staff labor should be included in cost inputs; taxes and financing are excluded.

Blue cells are inputs; green cells contain formulas. Enter rates as percentages
(e.g. 20%). A nonpositive contribution per referral displays **Not achievable** in
break-even cells. Monthly break-even excludes one-time startup costs. The year-end
cash balance uses month 12's balance, not a sum of monthly balances.

To regenerate the original practice workbook, install Python's **XlsxWriter** package
and run `python3 business/create_economics_workbook.py` from the repository root.
**Regeneration overwrites the workbook with practice inputs**, so retain edited
working copies separately. Neither Python nor XlsxWriter is needed to open the file
in Excel. Formulas recalculate automatically when inputs change.

Validation used an independent LibreOffice recalculation of the original workbook
and temporary copies with zero completions, zero contribution, and changed volume,
fees, startup cost and starting cash. Formula errors, cross-sheet updates, annual
sums and break-even behavior were checked. No test data or credentials from the app
are included in this workbook.
