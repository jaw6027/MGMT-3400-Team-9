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

## Actual results and vendor payments

Two additional tabs start **blank**, so practice projections cannot be mistaken for
actual business results:

- **Vendor Payments:** 200 prepared rows for a unique invoice/reference ID, vendor
  business name, earned date, fee earned, due date, cumulative amount received, and
  most recent payment date. Outstanding and overdue balances and payment status
  calculate automatically. Update the same row as partial receipts arrive; do not
  create a second invoice row for another receipt. A payment due today is not overdue
  until tomorrow. Use anonymous references, without homeowner names or bill details.
- **Actual vs Plan:** set the reporting start month (first day of a month), then
  enter actual variable and fixed operating costs and mark a reviewed month **Yes**.
  Earned revenue is linked by earned date from the payment ledger. Missing costs,
  unreviewed months, or any flagged ledger row leave results blank. Enter a real zero
  when there was genuinely no cost. Month 1 maps to your selected start month.

Ledger summaries use only rows marked **OK**. Duplicate IDs, invalid/missing dates,
missing fees, overpayments and inconsistent receipt dates are flagged in **Data
check**, and the count of rows needing correction is visible at the top. Fix all
flagged rows before interpreting monthly actuals. Do not treat excluded rows as zero
business activity. A blank received amount means no receipt recorded yet, not a
verified statement from the bank.

Actual revenue means **fees earned**, not cash collected. The cumulative receipt
field and most recent payment date do not form a month-by-month cash transaction
history. Fees earned before the reporting period remain in the ledger summary but
are excluded from that period's earned revenue. These worksheets are a planning
record, not a replacement for an accountant's revenue-recognition or tax guidance.
Refunds, write-offs and overpayments require separate review.

Revenue and profit variance are actual minus planned, so a positive variance is
favorable. Comparable totals include only months with complete reviewed actual
profit, and compare against those same planned months; they do not compare a partial
year of actuals with a full-year plan. One-time startup spending, taxes and financing
remain outside this operating-profit comparison. The original Monthly Plan cash
chart remains a **forecast**, not actual bank cash.

There is no automatic website/bank import. Enter checked records manually. Prepared
ledger rows can be filtered; print a selection if you do not want unused rows printed.
**Regenerating the workbook also clears these new tabs**; save your edited copy
separately before running the generator.

The added sheets were also recalculated independently with synthetic invoices:
part-paid, fully paid, unpaid, due-today, and outside-period fees; reviewed-month
profit and comparable-plan totals; and duplicate IDs, overpayments and inconsistent
receipt dates. The distributed file contains none of those synthetic actual records.
