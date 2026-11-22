// Run after npm run build. Uses synthetic data only and serves on a temporary local port.
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { resolve, relative, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const server = createServer(async (request, response) => {
  try {
    const path = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    const file = resolve(root, '.' + (path === '/' ? '/index.html' : path));
    if (relative(root, file).startsWith('..')) throw new Error('Outside test root');
    const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
    response.setHeader('Content-Type', types[extname(file)] || 'application/octet-stream');
    response.end(await readFile(file));
  } catch { response.writeHead(404); response.end(); }
});
server.listen(0, '127.0.0.1');
await once(server, 'listening');
const origin = `http://127.0.0.1:${server.address().port}/`;
let browser;
try {
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto(origin);
  await page.locator('#team-attention-link').click();
  await page.waitForURL('**/vendor-tracker.html#needs-attention');
  assert.equal(await page.locator('#needs-attention').isVisible(), true);
  await page.evaluate(() => localStorage.setItem('helio-home:progress:v1', 'unrelated'));
  assert.equal(await page.locator('h1').textContent(), 'Vendor performance');
  assert.equal(await page.locator('#tracker-empty').isVisible(), true);
  assert.equal(await page.locator('#tracker-more-metrics').getAttribute('open'), null);
  assert.equal(await page.locator('#tracker-charts-empty').isVisible(), true);
  assert.equal(await page.locator('#tracker-chart-sort').isDisabled(), true);
  const totals = () => page.locator('#tracker-vendor-totals tr').evaluateAll(rows => rows.map(row => [...row.cells].map(cell => cell.textContent)));
  assert.equal(await page.locator('[data-attention=waiting] strong').textContent(), '0');
  const today = await page.locator('[name=referred]').inputValue();
  await page.locator('[name=vendor]').fill('Synthetic <provider>');
  await page.locator('[name=followup]').fill(today);
  await page.selectOption('[name=service]', 'solar');
  await page.locator('[name=owner]').fill('TEAM1');
  await page.selectOption('[name=nextAction]', 'contact');
  await page.locator('#tracker-form [type=submit]').click();
  assert.equal(await page.locator('#tracker-records tr').count(), 1);
  assert.deepEqual(await totals(), [['Synthetic <provider>', '1', '0', '0']]);
  assert.equal(await page.locator('[data-attention=waiting] strong').textContent(), '1');
  assert.equal(await page.locator('[data-attention=due] strong').textContent(), '1');
  assert.equal(await page.locator('[data-attention=unassigned] strong').textContent(), '0');
  assert.equal(await page.locator('[data-attention=missing] strong').textContent(), '0');
  assert.equal(await page.locator('#tracker-performance td').first().textContent(), 'Synthetic <provider>');
  assert.equal(await page.locator('#tracker-performance td').last().textContent(), '1');
  assert.equal(await page.evaluate(() => localStorage.getItem('helio-home:referral-tracker:v1')), null);
  await page.getByRole('button', { name: /^Edit referral/ }).click();
  await page.selectOption('[name=stage]', 'installed');
  await page.locator('#tracker-form [type=submit]').click();
  assert.match(await page.locator('#tracker-status').textContent(), /first contact date/);
  await page.locator('[name=contacted]').fill(today);
  await page.locator('[name=installed]').fill(today);
  await page.selectOption('[name=rating]', '4');
  await page.locator('#tracker-form [type=submit]').click();
  assert.match(await page.locator('#tracker-performance').textContent(), /100.0%/);
  assert.match(await page.locator('#tracker-performance').textContent(), /4.0.5 \(1 ratings\)/);
  assert.equal(await page.locator('#tracker-performance td').last().textContent(), '0');
  assert.deepEqual(await totals(), [['Synthetic <provider>', '1', '1', '1']]);
  await page.locator('#tracker-save').click();
  const backup = await page.evaluate(() => localStorage.getItem('helio-home:referral-tracker:v1'));
  assert.equal(JSON.parse(backup).records.length, 1);
  assert.equal(JSON.parse(backup).records[0].owner, 'TEAM1');
  assert.equal(JSON.parse(backup).records[0].service, 'solar');
  assert.deepEqual(JSON.parse(backup).records[0].history.map(event => event.stage), ['referred', 'installed']);
  assert.equal(await page.locator('[data-attention=waiting] strong').textContent(), '0');
  await page.reload(); assert.equal(await page.locator('#tracker-records tr').count(), 0);
  await page.locator('#tracker-load').click(); assert.equal(await page.locator('#tracker-records tr').count(), 1);
  const downloadPromise = page.waitForEvent('download'); await page.locator('#tracker-export').click();
  const download = await downloadPromise;
  assert.deepEqual(JSON.parse(await readFile(await download.path(), 'utf8')), JSON.parse(backup));
  await page.locator('#tracker-file').setInputFiles({ name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from('{"version":8}') });
  await page.waitForFunction(() => document.querySelector('#tracker-status').textContent.includes('Import failed'));
  assert.match(await page.locator('#tracker-status').textContent(), /Import failed/);
  assert.equal(await page.locator('#tracker-records tr').count(), 1);
  page.on('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: /^Delete referral/ }).click();
  assert.equal(await page.locator('#tracker-records tr').count(), 0);
  await page.locator('#tracker-file').setInputFiles({ name: 'backup.json', mimeType: 'application/json', buffer: Buffer.from(backup) });
  await page.waitForFunction(() => document.querySelectorAll('#tracker-records tr').length === 1);
  await page.locator('#tracker-clear').click();
  assert.equal(await page.evaluate(() => localStorage.getItem('helio-home:referral-tracker:v1')), null);
  assert.equal(await page.evaluate(() => localStorage.getItem('helio-home:progress:v1')), 'unrelated');
  assert.equal(await page.locator('#tracker-records tr').count(), 1);
  // Mixed stages and vendors must count contacts across later stages, too.
  const installed = JSON.parse(backup).records[0];
  delete installed.history; // Legacy fixtures deliberately have no captured timeline.
  const records = [
    { ...installed, id: 'summary-1', vendor: 'Vendor A' },
    { ...installed, id: 'summary-2', vendor: 'vendor a', stage: 'closed', installed: '' },
    { ...installed, id: 'summary-3', vendor: 'Vendor A', stage: 'referred', contacted: '', installed: '', nextAction: '' },
    { ...installed, id: 'summary-4', vendor: 'Vendor B', stage: 'contacted', installed: '' },
  ];
  await page.locator('#tracker-file').setInputFiles({ name: 'summary.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ version: 1, records })) });
  await page.waitForFunction(() => document.querySelectorAll('#tracker-vendor-totals tr').length === 2);
  assert.deepEqual(await totals(), [['Vendor A', '3', '2', '1'], ['Vendor B', '1', '1', '0']]);
  assert.equal(await page.locator('#tracker-empty').isVisible(), false);
  await page.locator('[data-attention=waiting]').click();
  assert.equal(await page.locator('#tracker-filter').inputValue(), 'waiting');
  assert.equal(await page.locator('#tracker-records tr').count(), 1);
  await page.locator('#tracker-show-all').click();
  assert.equal(await page.locator('#tracker-records tr').count(), 4);
  await page.selectOption('#tracker-filter', 'due');
  assert.equal(await page.locator('#tracker-records tr').count(), 2);
  assert.deepEqual(await totals(), [['Vendor A', '3', '2', '1'], ['Vendor B', '1', '1', '0']]);
  await page.selectOption('#tracker-filter', 'unplanned');
  assert.equal(await page.locator('#tracker-records tr').count(), 1);
  await page.getByRole('button', { name: 'Edit referral summary-3', exact: true }).click();
  assert.equal(await page.locator('[name=owner]').inputValue(), 'TEAM1');
  await page.selectOption('[name=stage]', 'quoted');
  await page.locator('[name=contacted]').fill(today);
  await page.locator('[name=consultation]').fill(today);
  await page.locator('[name=quoteDate]').fill(today);
  await page.selectOption('[name=nextAction]', 'review');
  await page.locator('#tracker-form [type=submit]').click();
  assert.equal(await page.locator('#tracker-records tr').count(), 0);
  await page.selectOption('#tracker-filter', 'all');
  assert.equal(await page.locator('#tracker-records tr').count(), 4);
  await page.getByRole('button', { name: 'Edit referral summary-3', exact: true }).click();
  assert.equal(await page.locator('[name=quoteDate]').inputValue(), today);
  await page.selectOption('[name=stage]', 'closed');
  await page.selectOption('[name=closeReason]', 'cost');
  await page.locator('[name=closedDate]').fill(today);
  await page.locator('#tracker-form [type=submit]').click();
  assert.deepEqual(await totals(), [['Vendor A', '3', '3', '1'], ['Vendor B', '1', '1', '0']]);
  const row = page.locator('#tracker-records tr').filter({ hasText: 'summary-3' });
  await row.locator('summary').first().click();
  assert.match(await row.textContent(), /Cost or financing/);
  await row.locator('.referral-timeline > summary').click();
  assert.match(await row.locator('.timeline').textContent(), /first tracked; earlier history unknown/);
  assert.equal(await row.locator('.timeline li').count(), 3);
  assert.match(await row.locator('.timeline li').last().textContent(), /Closed without installation/);

  const daysAgo = days => new Date(Date.parse(today) - days * 86400000).toISOString().slice(0, 10);
  const chartRecords = [
    { id: 'chart-1', vendor: 'Alpha', stage: 'installed', referred: daysAgo(6), contacted: daysAgo(4), installed: today },
    { id: 'chart-2', vendor: 'Alpha', stage: 'contacted', referred: daysAgo(6), contacted: daysAgo(2) },
    { id: 'chart-3', vendor: 'Alpha', stage: 'referred', referred: daysAgo(6) },
    { id: 'chart-4', vendor: 'Beta', stage: 'installed', referred: today, contacted: today, installed: today },
    { id: 'chart-5', vendor: 'Gamma <uncontacted>', stage: 'referred', referred: today },
  ];
  await page.locator('#tracker-file').setInputFiles({ name: 'chart.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ version: 1, records: chartRecords })) });
  await page.waitForFunction(() => document.querySelectorAll('#tracker-rate-chart li').length === 3);
  assert.equal(await page.locator('#tracker-charts').isVisible(), true);
  assert.equal(await page.locator('#tracker-charts-empty').isVisible(), false);
  assert.match(await page.locator('#tracker-rate-chart li').nth(0).textContent(), /33.3%.*1 installed \/ 3 referrals/);
  assert.equal(await page.locator('#tracker-rate-chart .chart-bar').nth(1).evaluate(el => el.style.width), '100%');
  assert.match(await page.locator('#tracker-response-chart li').nth(0).textContent(), /3.0 days.*2 with a contact date.*1 without/);
  assert.equal(await page.locator('#tracker-response-max').textContent(), '3 days');
  assert.match(await page.locator('#tracker-response-chart li').nth(1).textContent(), /0.0 days/);
  assert.match(await page.locator('#tracker-response-chart li').nth(2).textContent(), /Not available/);
  await page.selectOption('#tracker-chart-sort', 'completion');
  assert.equal(await page.locator('#tracker-rate-chart strong').first().textContent(), 'Beta');
  await page.selectOption('#tracker-chart-sort', 'response');
  assert.deepEqual(await page.locator('#tracker-response-chart strong').allTextContents(), ['Beta', 'Alpha', 'Gamma <uncontacted>']);
  await page.selectOption('#tracker-filter', 'unplanned');
  assert.equal(await page.locator('#tracker-rate-chart li').count(), 3);
  assert.equal(await page.locator('[data-attention=waiting] strong').textContent(), '2');
  assert.equal(await page.locator('[data-attention=unassigned] strong').textContent(), '3');
  assert.equal(await page.locator('[data-attention=missing] strong').textContent(), '3');
  assert.equal(await page.locator('[data-attention=due] strong').textContent(), '0');
  await page.screenshot({ path: '/tmp/vendor-charts-desktop.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await page.screenshot({ path: '/tmp/vendor-charts-mobile.png', fullPage: true });
  assert.deepEqual(errors, []);
  console.log('PASS: add/edit/delete, event validation, performance totals, literal business names, opt-in save, load, backup/import, rejected corrupt import, isolated deletion, mobile.');
} finally {
  await browser?.close(); server.closeAllConnections(); await new Promise(resolve => server.close(resolve));
}
