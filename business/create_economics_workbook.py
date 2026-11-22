"""Regenerate the class-project workbook: python3 business/create_economics_workbook.py.
Requires XlsxWriter; generated formulas are recalculated by Excel on opening.
"""
from pathlib import Path
import math
from datetime import date, datetime
from zoneinfo import ZoneInfo
import xlsxwriter

OUTPUT = Path(__file__).with_name('Helio_Home_Venture_Economics.xlsx')
w = xlsxwriter.Workbook(OUTPUT)
w.set_properties({'title': 'Helio Home Venture Economics', 'subject': 'Illustrative solar referral business economics', 'author': 'MGMT 3400 Team 9', 'comments': 'Practice assumptions only; replace with verified costs and payment agreements.'})
w.set_calc_mode('auto')
navy, green, pale, blue = '#173D31', '#246B4C', '#EAF1EB', '#E8F1FF'
formats = {
 'title': w.add_format({'bold': True, 'font_size': 22, 'font_color': navy}),
 'sub': w.add_format({'font_color': '#485F52', 'text_wrap': True, 'valign': 'vcenter'}),
 'head': w.add_format({'bold': True, 'bg_color': navy, 'font_color': 'white', 'text_wrap': True, 'valign': 'vcenter'}),
 'label': w.add_format({'font_color': navy, 'text_wrap': True, 'valign': 'vcenter'}),
 'note': w.add_format({'font_color': '#58655F', 'font_size': 10, 'text_wrap': True, 'valign': 'vcenter'}),
 'inputmoney': w.add_format({'bg_color': blue, 'font_color': '#124E96', 'num_format': '$#,##0.00;[Red]($#,##0.00)', 'border': 1, 'border_color': '#B5CADE'}),
 'inputint': w.add_format({'bg_color': blue, 'font_color': '#124E96', 'num_format': '#,##0', 'border': 1, 'border_color': '#B5CADE'}),
 'inputpercent': w.add_format({'bg_color': blue, 'font_color': '#124E96', 'num_format': '0.0%', 'border': 1, 'border_color': '#B5CADE'}),
 'money': w.add_format({'bg_color': pale, 'num_format': '$#,##0.00;[Red]($#,##0.00)', 'valign': 'vcenter'}),
 'int': w.add_format({'bg_color': pale, 'num_format': '#,##0', 'valign': 'vcenter'}),
 'decimal': w.add_format({'bg_color': pale, 'num_format': '#,##0.0', 'valign': 'vcenter'}),
 'percent': w.add_format({'bg_color': pale, 'num_format': '0.0%', 'valign': 'vcenter'}),
 'totalmoney': w.add_format({'bg_color': '#D7E8DC', 'bold': True, 'num_format': '$#,##0.00;[Red]($#,##0.00)', 'top': 1}),
 'totalnumber': w.add_format({'bg_color': '#D7E8DC', 'bold': True, 'num_format': '#,##0.0', 'top': 1}),
 'bad': w.add_format({'bg_color': '#FCE8E6', 'font_color': '#9C2222'}),
}

def setup(name, last_col, widths):
 s = w.add_worksheet(name); s.hide_gridlines(2); s.set_tab_color(green); s.set_default_row(23)
 for col, width in enumerate(widths): s.set_column(col, col, width)
 s.freeze_panes(5, 1); s.set_landscape(); s.set_paper(9); s.fit_to_pages(1, 1)
 s.set_margins(.3, .3, .4, .4); s.set_footer('&LHelio Home · Practice assumptions&C&P of &N')
 s.print_area(0, 0, 32 if name != 'Scenarios' else 40, last_col)
 return s

def title(s, text, end, note):
 s.merge_range(0, 0, 0, end, text, formats['title']); s.set_row(0, 34)
 s.merge_range(1, 0, 2, end, note, formats['sub']); s.set_row(1, 24); s.set_row(2, 24)

def formula(s, address, expression, value, fmt='money'):
 s.write_formula(address, expression, formats[fmt], value)

def validation(s, address, percent=False, whole=False):
 s.data_validation(address, {'validate': 'decimal' if percent or not whole else 'integer', 'criteria': 'between', 'minimum': 0, 'maximum': 1 if percent else 1000000, 'ignore_blank': False, 'input_title': 'Editable practice assumption', 'input_message': 'Use 20% or 0.20 for a 20% rate.' if percent else 'Enter a nonnegative number. Replace practice values with evidence.', 'error_title': 'Check this value', 'error_message': 'Use a rate from 0% to 100%.' if percent else 'Enter a nonnegative value within the allowed range.'})

start = setup('Start Here', 3, [30, 27, 27, 45])
a = setup('Assumptions', 2, [43, 23, 86])
m = setup('Monthly Plan', 9, [15, 15, 19, 20, 19, 18, 21, 20, 20, 22])
s = setup('Scenarios', 3, [43, 25, 25, 25])
start.activate(); start.freeze_panes(0, 0)
title(start, 'Helio Home · Venture economics', 3, 'CLASS PROJECT · All starting numbers are illustrative assumptions, not verified vendor fees, operating costs or a forecast.')
start.merge_range('A5:D5', 'How to use this workbook', formats['head'])
steps = [
 ('1. Edit blue cells', 'Begin with Assumptions. Replace practice values with vendor agreements, cost quotes and your group’s estimates.'),
 ('2. Review monthly results', 'Monthly Plan calculates 12 flat months from your assumptions. Green cells contain formulas and update automatically.'),
 ('3. Compare uncertainty', 'Scenarios compares low, expected and high outcomes. The expected column links to Assumptions; blue low/high cells are editable.'),
 ('4. Check break-even', 'Break-even uses contribution per referral. If contribution is zero or negative, the model displays Not achievable.'),
 ('5. Gather real evidence', 'Use completed projects / all referrals from the tracker as a starting point, while allowing enough time for open projects to finish.'),
]
for row, (heading, text) in enumerate(steps, 5):
 start.write(row, 0, heading, formats['label']); start.merge_range(row, 1, row, 3, text, formats['sub']); start.set_row(row, 48)
start.merge_range('A12:D12', 'Expected case · based on the current assumptions', formats['head'])
for row, label, expression, value, fmt in [
 (12, 'Monthly operating profit', "=Assumptions!B25", 600, 'money'),
 (13, 'Break-even referrals / month', '=Assumptions!B24', 10, 'int'),
 (14, 'Year 1 operating profit', "='Monthly Plan'!G19", 7200, 'money'),
 (15, 'Year-end modeled cash balance', "='Monthly Plan'!J19", 5700, 'money'),
]:
 start.write(row, 0, label, formats['label']); formula(start, f'B{row+1}', expression, value, fmt)
start.merge_range('A18:D18', 'Read before presenting the results', formats['head'])
notes = [
 'Revenue here is money paid to your business. Homeowner electricity savings are separate and are not business revenue.',
 'Revenue model: payment for completed projects only. Confirm written vendor terms, eligibility, refunds and applicable referral/licensing rules before relying on fees.',
 'This is an expected-value model: completed projects can be fractional. Actual jobs and payments arrive unevenly and can take several months.',
 'Cash is simplified: all fees and expenses are received/paid in the modeled month; startup cost is paid in month 1. Negative balances signal a funding gap under those timing assumptions.',
 'Taxes, loan payments, interest, unpaid fees and payment delays are not modeled. Include owner/staff time, licenses and other business costs in the relevant input rows.',
]
for row, text in enumerate(notes, 18): start.merge_range(row, 0, row, 3, text, formats['note']); start.set_row(row, 40)
start.write_url('A25', "internal:'Assumptions'!A1", string='Open Assumptions →')
start.write_url('B25', "internal:'Monthly Plan'!A1", string='Open Monthly Plan →')
start.write_url('C25', "internal:'Scenarios'!A1", string='Open Scenarios →')

title(a, 'Editable business assumptions', 2, 'Blue cells are editable. Green cells calculate results. These practice values are examples only; record your evidence in the notes column.')
a.write_row('A5', ['Assumption', 'Value', 'Evidence / explanation'], formats['head'])
inputs = {
 6: ('Monthly referrals received', 20, 'inputint', 'Practice volume. Replace with a lead/referral plan; one referral is one homeowner/project/vendor record.'),
 7: ('Referral-to-project completion rate', .2, 'inputpercent', 'Practice rate of 20%. Use a representative period and account for open projects that need more time.'),
 8: ('Payment per completed project', 500, 'inputmoney', 'Unverified practice fee. Confirm a written vendor agreement and applicable referral/licensing rules.'),
 9: ('Marketing / acquisition cost per referral', 20, 'inputmoney', 'Practice allocation. Divide relevant marketing costs by referrals received, not clicks or inquiries.'),
 10: ('Staff / owner support cost per referral', 15, 'inputmoney', 'Practice allocation. Include time spent reviewing usage, matching vendors and following up.'),
 11: ('Travel / assessment cost per referral', 5, 'inputmoney', 'Practice expected allocation. Include paid travel or assessment work where applicable.'),
 14: ('Monthly hosting and software', 100, 'inputmoney', 'Practice cost, not a hosting quote. Obtain actual website/database/software costs.'),
 15: ('Monthly insurance and administration', 200, 'inputmoney', 'Practice cost. Obtain appropriate insurance, administration and required-license estimates.'),
 16: ('Other monthly fixed costs', 300, 'inputmoney', 'Practice allowance. Avoid double-counting costs already included per referral.'),
 19: ('One-time startup cost', 1500, 'inputmoney', 'Practice allowance for setup/equipment/registration. Paid in month 1 in this simplified plan.'),
 20: ('Starting cash available', 0, 'inputmoney', 'Available business cash before month 1; not revenue or profit.'),
}
for row, (label, value, fmt, note) in inputs.items():
 a.write(f'A{row}', label, formats['label']); a.write_number(f'B{row}', value, formats[fmt]); a.write(f'C{row}', note, formats['note']); a.set_row(row-1, 40)
 validation(a, f'B{row}', percent=fmt=='inputpercent', whole=fmt=='inputint')
for row, label, expression, cached, fmt, note in [
 (12, 'Total variable cost per referral', '=SUM(B9:B11)', 40, 'money', 'Incurred for every referral, including those that do not become projects.'),
 (17, 'Total monthly fixed costs', '=SUM(B14:B16)', 600, 'money', 'Incurred each month regardless of the number of referrals.'),
 (22, 'Expected revenue per referral', '=B7*B8', 100, 'money', 'Completion rate × payment per completed project.'),
 (23, 'Contribution per referral', '=B22-B12', 60, 'money', 'Expected revenue less variable costs. This pays fixed costs, then contributes to profit.'),
 (24, 'Break-even referrals per month', '=IF(B23>0,ROUNDUP(B17/B23,0),"Not achievable")', 10, 'int', 'Covers recurring operating costs only; excludes startup costs and payment timing.'),
 (25, 'Expected monthly operating profit', '=B6*B23-B17', 600, 'money', 'Before startup costs, taxes, financing and owner distributions.'),
]:
 a.write(f'A{row}', label, formats['label']); formula(a, f'B{row}', expression, cached, fmt); a.write(f'C{row}', note, formats['note']); a.set_row(row-1, 35)
a.conditional_format('B23:B25', {'type': 'cell', 'criteria': '<', 'value': 0, 'format': formats['bad']})
a.print_area('A1:C26')

title(m, '12-month expected financial plan', 9, 'A flat monthly plan linked to Assumptions. Expected projects may be fractional. Operating profit excludes startup costs; modeled cash includes startup cost in month 1 and starting cash.')
m.write_row('A5', ['Month', 'Referrals', 'Expected completed projects', 'Business revenue', 'Variable costs', 'Fixed costs', 'Operating profit', 'Startup cost', 'Net cash generated', 'Ending cash balance'], formats['head']); m.set_row(4, 44)
for month in range(1, 13):
 row = month+5; m.write(f'A{row}', f'Month {month}', formats['label'])
 for col, expr, cached, fmt in [
  ('B', '=Assumptions!$B$6', 20, 'int'), ('C', f'=B{row}*Assumptions!$B$7', 4, 'decimal'),
  ('D', f'=C{row}*Assumptions!$B$8', 2000, 'money'), ('E', f'=B{row}*Assumptions!$B$12', 800, 'money'),
  ('F', '=Assumptions!$B$17', 600, 'money'), ('G', f'=D{row}-E{row}-F{row}', 600, 'money'),
  ('H', '=Assumptions!$B$19' if month==1 else '=0', 1500 if month==1 else 0, 'money'),
  ('I', f'=G{row}-H{row}', -900 if month==1 else 600, 'money'),
  ('J', f'=Assumptions!$B$20+I{row}' if month==1 else f'=J{row-1}+I{row}', month*600-1500, 'money'),
 ]: formula(m, f'{col}{row}', expr, cached, fmt)
m.write('A19', 'Year 1 totals', formats['head'])
for col, cached in [('B',240),('C',48),('D',24000),('E',9600),('F',7200),('G',7200),('H',1500),('I',5700)]: formula(m, f'{col}19', f'=SUM({col}6:{col}17)', cached, 'totalnumber' if col in ['B','C'] else 'totalmoney')
formula(m, 'J19', '=J17', 5700, 'totalmoney')
m.conditional_format('G6:J19', {'type': 'cell', 'criteria': '<', 'value': 0, 'format': formats['bad']})
m.merge_range('A21:J21', 'Ending cash is a balance, so the total row uses month 12 rather than summing monthly balances. Negative balances are highlighted.', formats['note'])
cash = w.add_chart({'type':'line'}); cash.add_series({'name':'Modeled ending cash', 'categories':"='Monthly Plan'!$A$6:$A$17", 'values':"='Monthly Plan'!$J$6:$J$17", 'line':{'color':green,'width':2.5}}); cash.set_title({'name':'Expected cash balance by month'}); cash.set_y_axis({'name':'Dollars', 'num_format':'$#,##0'}); cash.set_legend({'none':True}); cash.set_style(13); m.insert_chart('B23', cash, {'x_scale':1.65, 'y_scale':.8}); m.print_area('A1:J36')

title(s, 'Low, expected and high scenarios', 3, 'Practice scenarios, not probabilities or forecasts. Edit blue low/high inputs; the expected column follows Assumptions. All cases use the same completed-project fee model.')
s.write_row('A5', ['Monthly inputs / results', 'Low case', 'Expected case', 'High case'], formats['head'])
scenario_inputs = [(6,'Referrals received',10,20,40,'int',6),(7,'Completion rate',.1,.2,.3,'percent',7),(8,'Payment per completed project',400,500,600,'money',8),(9,'Variable cost per referral',50,40,30,'money',12),(10,'Monthly fixed costs',800,600,900,'money',17),(11,'One-time startup cost',2000,1500,1500,'money',19)]
for row, label, low, expected, high, fmt, source in scenario_inputs:
 s.write(f'A{row}',label,formats['label'])
 for col, val in [('B',low),('D',high)]: s.write_number(f'{col}{row}',val,formats['input'+fmt]); validation(s,f'{col}{row}',percent=fmt=='percent',whole=fmt=='int')
 formula(s, f'C{row}', f'=Assumptions!B{source}', expected, fmt)
for col, refs, rate, fee, variable, fixed, startup in [('B',10,.1,400,50,800,2000),('C',20,.2,500,40,600,1500),('D',40,.3,600,30,900,1500)]:
 profit=refs*rate*fee-refs*variable-fixed; contribution=rate*fee-variable
 results=[(13,'Expected completed projects', f'={col}6*{col}7', refs*rate,'decimal'),(14,'Expected monthly revenue', f'={col}13*{col}8',refs*rate*fee,'money'),(15,'Expected monthly variable costs', f'={col}6*{col}9',refs*variable,'money'),(16,'Expected monthly operating profit', f'={col}14-{col}15-{col}10',profit,'money'),(17,'Contribution per referral', f'={col}7*{col}8-{col}9',contribution,'money'),(18,'Break-even referrals / month', f'=IF({col}17>0,ROUNDUP({col}10/{col}17,0),"Not achievable")',math.ceil(fixed/contribution) if contribution>0 else 'Not achievable','int'),(19,'Month 1 net cash generated',f'={col}16-{col}11',profit-startup,'money'),(20,'Year 1 operating profit', f'={col}16*12',profit*12,'money'),(21,'Year 1 net cash generated',f'={col}20-{col}11',profit*12-startup,'money')]
 for row,label,expr,value,fmt in results:
  s.write(f'A{row}',label,formats['label']); formula(s,f'{col}{row}',expr,value,fmt)
s.conditional_format('B16:D21',{'type':'cell','criteria':'<','value':0,'format':formats['bad']})
s.merge_range('A23:D24', '“Not achievable” means expected revenue per referral does not cover variable cost. More referrals alone will not solve that case. Break-even excludes startup costs; cash results exclude starting cash.', formats['note'])
chart = w.add_chart({'type':'column'})
for col,name,color in [('B','Low case','#9A6B35'),('C','Expected case',green),('D','High case','#285B86')]: chart.add_series({'name':name,'categories':['Scenarios',15,0,15,0],'values':f'=Scenarios!${col}$16','fill':{'color':color},'border':{'none':True},'data_labels':{'value':True,'num_format':'$#,##0'}})
chart.set_title({'name':'Expected monthly operating profit'}); chart.set_y_axis({'name':'Dollars','num_format':'$#,##0'}); chart.set_legend({'position':'bottom'}); chart.set_style(13); s.insert_chart('A27',chart,{'x_scale':1.5,'y_scale':.9}); s.print_area('A1:D41')

# Actual results are intentionally blank. Payment rows are one invoice per row;
# total received is cumulative, not a cash transaction log.
actual = setup('Actual vs Plan', 10, [17, 20, 20, 20, 20, 20, 20, 22, 22, 22, 19])
pay = setup('Vendor Payments', 10, [24, 29, 19, 20, 19, 21, 21, 20, 20, 21, 36])
for sheet in [actual, pay]: sheet.freeze_panes(7, 2); sheet.set_row(6, 48)
formats['inputdate'] = w.add_format({'bg_color': blue, 'font_color': '#124E96', 'num_format': 'mmm d, yyyy', 'border': 1, 'border_color': '#B5CADE'})
formats['outputdate'] = w.add_format({'bg_color': pale, 'num_format': 'mmm d, yyyy'})
formats['date'] = w.add_format({'bg_color': pale, 'num_format': 'mmm yyyy'})
formats['inputtext'] = w.add_format({'bg_color': blue, 'font_color': '#124E96', 'border': 1, 'border_color': '#B5CADE'})
formats['status'] = w.add_format({'bg_color': pale, 'text_wrap': True, 'font_color': navy})
today = datetime.now(ZoneInfo('America/Los_Angeles')).date()
start_month = date(today.year, today.month, 1)
def serial(value): return (value - date(1899, 12, 30)).days

title(pay, 'Vendor fees and payments', 10, 'Enter real records only · One row per unique invoice/reference. Amount received is the cumulative total for that invoice, including partial payments. Blue cells are editable. No customer names, addresses or bill details are needed.')
for cell, label in [('A4','Fees earned · valid rows'),('D4','Received · valid rows'),('G4','Outstanding · valid rows'),('J4','Rows needing fixes'),('A5','Overdue · valid rows'),('D5','As of today')]: pay.write(cell,label,formats['label'])
formula(pay,'B4','=SUMIF(K8:K207,"OK",D8:D207)',0)
formula(pay,'E4','=SUMIF(K8:K207,"OK",F8:F207)',0)
formula(pay,'H4','=SUMIF(K8:K207,"OK",H8:H207)',0)
formula(pay,'K4','=COUNTIF(K8:K207,"?*")-COUNTIF(K8:K207,"OK")',0,'int')
formula(pay,'B5','=SUMIF(K8:K207,"OK",I8:I207)',0)
formula(pay,'E5','=TODAY()',serial(today),'outputdate')
pay.write_row('A7',['Invoice / referral ID','Vendor business name','Fee earned date','Fee earned / invoiced','Payment due date','Total received to date','Most recent payment date','Outstanding balance','Overdue balance','Payment status','Data check'],formats['head'])
for r in range(8,208):
 for col in ['A','B']: pay.write_blank(f'{col}{r}',None,formats['inputtext'])
 for col in ['C','E','G']:
  pay.write_blank(f'{col}{r}',None,formats['inputdate'])
  pay.data_validation(f'{col}{r}',{'validate':'date','criteria':'between','minimum':datetime(2000,1,1),'maximum':datetime(2100,12,31),'ignore_blank':True,'error_title':'Check the date','error_message':'Enter an Excel date between 2000 and 2100.'})
 for col in ['D','F']: pay.write_blank(f'{col}{r}',None,formats['inputmoney']); validation(pay,f'{col}{r}')
 # Nested IFs retain compatibility with older Excel versions and flag invalid pasted values.
 check=f'=IF(COUNTA(A{r}:G{r})=0,"",IF(A{r}="","Add invoice/reference ID",IF(SUMPRODUCT(--($A$8:$A$207=A{r}))>1,"Duplicate ID",IF(B{r}="","Add vendor name",IF(OR(NOT(ISNUMBER(C{r})),C{r}<DATE(2000,1,1),C{r}>TODAY()),"Check earned date",IF(OR(NOT(ISNUMBER(D{r})),D{r}<0),"Enter fee earned",IF(OR(NOT(ISNUMBER(E{r})),E{r}<C{r},E{r}>DATE(2100,12,31)),"Check due date",IF(AND(F{r}<>"",OR(NOT(ISNUMBER(F{r})),F{r}<0,F{r}>D{r})),"Check amount received",IF(AND(N(F{r})>0,OR(NOT(ISNUMBER(G{r})),G{r}<C{r},G{r}>TODAY())),"Check payment date",IF(AND(N(F{r})=0,G{r}<>""),"Clear date or enter receipt","OK"))))))))))'
 formula(pay,f'K{r}',check,'','status')
 formula(pay,f'H{r}',f'=IF(K{r}="OK",MAX(D{r}-N(F{r}),0),"")','','money')
 formula(pay,f'I{r}',f'=IF(K{r}="OK",IF(AND(H{r}>0,E{r}<TODAY()),H{r},0),"")','','money')
 formula(pay,f'J{r}',f'=IF(K{r}="", "",IF(K{r}<>"OK","Needs review",IF(H{r}=0,"Paid",IF(I{r}>0,"Overdue",IF(N(F{r})>0,"Part-paid","Awaiting payment")))))','','status')
pay.autofilter('A7:K207')
pay.conditional_format('A8:K207',{'type':'formula','criteria':'=AND($K8<>"",$K8<>"OK")','format':formats['bad']})
pay.conditional_format('I8:I207',{'type':'cell','criteria':'>','value':0,'format':formats['bad']})
pay.merge_range('A210:K211','Only rows marked OK enter the summaries. Duplicate IDs flag all matching rows. Payment due today is not overdue until tomorrow. Do not enter a receipt as a second invoice row; update the cumulative received amount. Refunds, overpayments and write-offs need review outside this simple ledger.',formats['note'])
pay.merge_range('A213:K214','The most recent payment date is a reference field, not a full receipt history. This cumulative ledger does not allocate partial receipts to individual months. Actual vs Plan compares earned fees with operating expenses, not bank cash flow.',formats['note'])
pay.fit_to_pages(1,0); pay.repeat_rows(6); pay.print_area('A1:K214')

title(actual,'Actual results vs. your plan',10,'Use real business results, not homeowner electricity savings. Revenue comes from valid earned-fee rows in Vendor Payments. Enter monthly operating costs and mark reviewed months Yes. Unreviewed or incomplete months stay blank.')
actual.write('A4','Plan start month',formats['label']); actual.write_datetime('B4',datetime.combine(start_month,datetime.min.time()),formats['inputdate'])
actual.data_validation('B4',{'validate':'custom','value':'=AND(ISNUMBER(B4),DAY(B4)=1,B4>=DATE(2000,1,1),B4<=DATE(2099,12,1))','ignore_blank':False,'error_title':'Use the first day','error_message':'Enter the first day of your reporting start month.'})
actual.merge_range('D4:K4','Month 1 in Monthly Plan = the start month selected here. Set this before entering results.',formats['note'])
actual.write('A5','Complete months',formats['label']); formula(actual,'B5','=COUNT(H8:H19)',0,'int')
actual.merge_range('D5:K5','',formats['status'])
# merge_range writes its label; write the formula again into the merged range's first cell.
formula(actual,'D5','=IF(\'Vendor Payments\'!K4>0,"Fix flagged Vendor Payments rows before actual results calculate.",IF(B5=0,"No complete reviewed months yet.","Totals compare only complete reviewed months."))','No complete reviewed months yet.','status')
actual.write_row('A7',['Month','Planned revenue','Actual fees earned','Revenue variance','Planned operating costs','Actual variable costs','Actual fixed costs','Actual operating profit','Planned operating profit','Profit variance','Month reviewed?'],formats['head'])
for i,r in enumerate(range(8,20)):
 month_index=start_month.year*12+start_month.month-1+i
 month=date(month_index//12,month_index%12+1,1)
 formula(actual,f'A{r}',f'=DATE(YEAR($B$4),MONTH($B$4)+{i},1)',serial(month),'date')
 formula(actual,f'B{r}',f"='Monthly Plan'!D{i+6}",2000)
 earned=f'SUMIFS(\'Vendor Payments\'!$D$8:$D$207,\'Vendor Payments\'!$C$8:$C$207,">="&A{r},\'Vendor Payments\'!$C$8:$C$207,"<"&DATE(YEAR(A{r}),MONTH(A{r})+1,1),\'Vendor Payments\'!$K$8:$K$207,"OK")'
 formula(actual,f'C{r}',f'=IF(AND(K{r}="Yes",COUNT(F{r}:G{r})=2,\'Vendor Payments\'!$K$4=0),{earned},"")','')
 formula(actual,f'D{r}',f'=IF(ISNUMBER(C{r}),C{r}-B{r},"")','')
 formula(actual,f'E{r}',f"=SUM('Monthly Plan'!E{i+6}:F{i+6})",1400)
 for col in ['F','G']: actual.write_blank(f'{col}{r}',None,formats['inputmoney']); validation(actual,f'{col}{r}')
 formula(actual,f'H{r}',f'=IF(ISNUMBER(C{r}),C{r}-SUM(F{r}:G{r}),"")','')
 formula(actual,f'I{r}',f"='Monthly Plan'!G{i+6}",600)
 formula(actual,f'J{r}',f'=IF(ISNUMBER(H{r}),H{r}-I{r},"")','')
 actual.write_blank(f'K{r}',None,formats['inputtext']); actual.data_validation(f'K{r}',{'validate':'list','source':['Yes','No'],'ignore_blank':True})
actual.write('A21','Comparable totals',formats['head'])
for col in 'BCDEFGHIJ': formula(actual,f'{col}21',f'=IF(COUNT($H$8:$H$19)>0,SUMPRODUCT(--ISNUMBER($H$8:$H$19),{col}8:{col}19),"")','','totalmoney')
actual.conditional_format('D8:D21',{'type':'cell','criteria':'<','value':0,'format':formats['bad']})
actual.conditional_format('H8:J21',{'type':'cell','criteria':'<','value':0,'format':formats['bad']})
actual.merge_range('A23:K24','Mark Yes only after all earned referral fees and both cost figures (including a real zero, if applicable) are entered. Any flagged ledger row pauses monthly actual results until corrected. Comparable totals include only months with a numeric actual profit, not the full-year plan.',formats['note'])
actual.merge_range('A26:K27','Variance = actual minus planned; positive revenue/profit variance is favorable. Costs here are recurring operating expenses only. Keep one-time startup costs, taxes and loan payments out of this operating-profit comparison. The original cash plan remains a forecast, not an actual cash statement.',formats['note'])
actual.merge_range('A29:K30','No automatic connection to the website or bank is included. Enter or paste checked records manually. Vendor fees are revenue when earned in this planning worksheet, even if not yet collected; your actual accounting/tax treatment may differ.',formats['note'])
actual.print_area('A1:K30')
start.merge_range('A27:D27','Track actual results after you begin operating',formats['head'])
start.merge_range('A28:D29','Vendor Payments tracks earned fees, due dates and cumulative receipts. Actual vs Plan uses that ledger plus your entered monthly costs. These tabs start blank; example projections are not actual results.',formats['note'])
start.write_url('A31',"internal:'Actual vs Plan'!A1",string='Open Actual vs Plan →')
start.write_url('C31',"internal:'Vendor Payments'!A1",string='Open Vendor Payments →')

w.close()
print(OUTPUT)
