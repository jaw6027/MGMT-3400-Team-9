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
  let executablePath = process.env.CHROMIUM_PATH;
  if (!executablePath) { try { await access('/usr/bin/chromium'); executablePath = '/usr/bin/chromium'; } catch {} }
  browser = await chromium.launch({ executablePath, headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(origin);
  const panels = ['save-details', 'bill-analysis', 'solar-plan-details', 'cost-details', 'recommendation-details', 'home-questionnaire-details', 'solar-example-homes', 'method-details'];
  for (const id of panels) assert.equal(await page.locator('#' + id).getAttribute('open'), null);
  assert.equal(await page.locator('main > section.card').count(), 3);
  assert.match(await page.locator('#review-title').textContent(), /^1\./);
  assert.match(await page.locator('#comparison-title').textContent(), /^2\./);
  assert.match(await page.locator('#inspection-step-title').textContent(), /^3\./);
  assert.equal(await page.locator('#choose-bill').isVisible(), true);
  assert.equal(await page.locator('#request-inspection').isVisible(), true);
  assert.equal(await page.locator('#home-area').isVisible(), false);
  assert.equal(await page.locator('#solarKw').isVisible(), false);
  assert.equal(await page.locator('#save-progress').isVisible(), false);
  const beforeHeight = await page.evaluate(() => document.documentElement.scrollHeight);
  await page.screenshot({ path: '/tmp/helio-simple-desktop.png', fullPage: true });
  await page.locator('.intro-skip').click();
  await page.locator('#request-inspection').click();
  assert.equal(await page.locator('#assessment-dialog').isVisible(), true);
  assert.match(await page.locator('#assessment-package').textContent(), /Inspection Visit/);
  await page.keyboard.press('Escape');
  await page.locator('#review-example').click();
  assert.equal(await page.locator('#comparison-results').isVisible(), true);
  assert.equal(await page.locator('#recommendation-title').isVisible(), true);
  assert.equal(await page.locator('#comparison-breakdown').isVisible(), false);
  assert.equal(await page.locator('#recommendation-services').isVisible(), false);
  assert.equal(await page.locator('#compare-current-annual').textContent(), '$2,421.00');
  assert.equal(await page.locator('#compare-solar-annual').textContent(), '$1,489.36');
  assert.equal(await page.locator('.estimate-limits').isVisible(), true);
  assert.match(await page.locator('#result-key-assumptions').textContent(), /6 kW.*70%/);
  assert.match(await page.locator('#result-key-assumptions').textContent(), /0\.180.*0\.050/);
  await page.locator('#homeowner-review > .review-heading a').click();
  assert.equal(await page.locator('#home-questionnaire-details').getAttribute('open'), '');
  await page.locator('#home-area').fill('1600');
  assert.equal(await page.locator('#bill-kwh-0').inputValue(), '1200');
  await page.locator('#home-questionnaire-details > summary').click();
  await page.locator('#cost-comparison > .review-heading a').click();
  assert.equal(await page.locator('#solarKw').isVisible(), true);
  await page.locator('#advanced-solar > summary').click();
  await page.locator('#sunHours').fill('');
  await page.locator('#advanced-solar > summary').click();
  await page.locator('#solar-plan-details > summary').click();
  await page.locator('#bill-kwh-0').fill('1200');
  assert.equal(await page.locator('#solar-plan-details').getAttribute('open'), '');
  assert.equal(await page.locator('#advanced-solar').getAttribute('open'), '');
  assert.equal(await page.locator('#sunHours').isVisible(), true);
  assert.equal(await page.locator('#comparison-results').isVisible(), false);
  await page.locator('#sunHours').fill('4.5');
  assert.equal(await page.locator('#comparison-results').isVisible(), true);
  await page.locator('#save-details > summary').click();
  await page.locator('#save-progress').click();
  assert.match(await page.locator('#save-progress-status').textContent(), /Progress saved/);
  for (const id of panels) await page.locator('#' + id).evaluate(element => { element.open = false; });
  const screenState = await page.evaluate(ids => ids.map(id => document.getElementById(id).open), panels);
  await page.evaluate(() => { window.print = () => { window.printCalled = true; }; });
  await page.locator('#print').click();
  assert.equal(await page.evaluate(() => window.printCalled), true);
  for (const id of ['bill-analysis', 'solar-plan-details', 'cost-details', 'recommendation-details', 'home-questionnaire-details']) {
    assert.equal(await page.locator('#' + id).getAttribute('open'), '');
  }
  await page.emulateMedia({ media: 'print' });
  assert.equal(await page.locator('#comparison-assumptions').isVisible(), true);
  assert.equal(await page.locator('#home-questionnaire-summary').isVisible(), true);
  assert.equal(await page.locator('#sun-help').isVisible(), true);
  assert.equal(await page.locator('#save-details').isVisible(), false);
  await page.pdf({ path: '/tmp/helio-simplified-report.pdf', format: 'A4', printBackground: true });
  await page.emulateMedia({ media: 'screen' });
  await page.evaluate(() => window.dispatchEvent(new Event('afterprint')));
  assert.deepEqual(await page.evaluate(ids => ids.map(id => document.getElementById(id).open), panels), screenState);
  assert.equal(await page.locator('#request-inspection').isVisible(), true);
  assert.equal(await page.locator('#bill-kwh-0').inputValue(), '1200');
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await page.screenshot({ path: '/tmp/helio-simple-mobile-results.png', fullPage: true });
  // A fresh screen shows the simple journey, even when results are not ready yet.
  await page.evaluate(() => localStorage.removeItem('helio-home:progress:v1'));
  await page.reload();
  const mobileHeight = await page.evaluate(() => document.documentElement.scrollHeight);
  await page.screenshot({ path: '/tmp/helio-simple-mobile.png', fullPage: true });
  assert.equal(await page.locator('#request-inspection').isVisible(), true);
  assert.equal(await page.locator('#home-questionnaire-form').isVisible(), false);
  const ids = await page.locator('[id]').evaluateAll(elements => elements.map(element => element.id));
  assert.equal(ids.length, new Set(ids).size);
  assert.deepEqual(errors, []);
  console.log('PASS: three-step default; optional panels closed; direct no-bill inspection; accurate results and visible limits; navigation opens details; nested validation; save controls; full print details; afterprint restores layout; mobile; unique IDs. Page heights:', { desktop: beforeHeight, mobile: mobileHeight });
} finally {
  await browser?.close();
  server.closeAllConnections();
  await new Promise(resolve => server.close(resolve));
}
