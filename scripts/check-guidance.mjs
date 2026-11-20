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
  assert.equal(await page.locator('.guide-steps li').count(), 3);
  for (const link of await page.locator('.guide-steps a').all()) {
    const target = await link.getAttribute('href');
    assert.equal(await page.locator(target).count(), 1);
  }
  assert.equal(await page.locator('#advanced-solar').getAttribute('open'), null);
  assert.equal(await page.locator('#sunHours').isVisible(), false);
  assert.equal(await page.locator('#solarKw').isVisible(), true);
  assert.equal(await page.locator('#annual-savings').textContent(), '$1,256');
  await page.locator('#review-example').click();
  assert.equal(await page.locator('.customer-meaning').isVisible(), true);
  assert.match(await page.locator('#meaning-bills').textContent(), /example bills.*12,450 kWh/);
  assert.match(await page.locator('#meaning-solar').textContent(), /lower ongoing costs/);
  assert.match(await page.locator('#meaning-solar').textContent(), /not installation or loan/);
  assert.match(await page.locator('#meaning-efficiency').textContent(), /does not make your appliances use less/);
  await page.locator('#advanced-solar summary').click();
  for (const id of ['sunHours', 'performance', 'selfUse', 'exportRate']) {
    assert.equal(await page.locator('#' + id).isVisible(), true);
    const hint = await page.locator('#' + id).getAttribute('aria-describedby');
    assert.equal(await page.locator('#' + hint).isVisible(), true);
  }
  await page.locator('#sunHours').fill('');
  await page.locator('#advanced-solar summary').click();
  await page.locator('#solarKw').fill('7');
  assert.equal(await page.locator('#advanced-solar').getAttribute('open'), '');
  assert.equal(await page.locator('#comparison-results').isVisible(), false);
  await page.locator('#sunHours').fill('4.5');
  assert.equal(await page.locator('#comparison-results').isVisible(), true);
  await page.locator('#project-costs summary').click();
  await page.locator('#monthlyFee').fill('1000');
  assert.match(await page.locator('#meaning-solar').textContent(), /increase ongoing costs/);
  await page.locator('#monthlyFee').fill('0');
  await page.locator('#solarKw').fill('0');
  await page.locator('#annualCost').fill('0');
  assert.match(await page.locator('#meaning-solar').textContent(), /roughly unchanged/);
  await page.locator('#efficiency').fill('0');
  assert.match(await page.locator('#meaning-efficiency').textContent(), /No reduction.*is assumed/);
  await page.locator('#reset').click();
  await page.locator('#advanced-solar').evaluate(details => { details.open = false; });
  await page.locator('#project-costs').evaluate(details => { details.open = false; });
  await page.screenshot({ path: '/tmp/helio-guidance-desktop.png', fullPage: true });
  await page.evaluate(() => { window.print = () => { window.didPrint = true; }; });
  await page.locator('#print').click();
  assert.equal(await page.evaluate(() => window.didPrint), true);
  assert.equal(await page.locator('#advanced-solar').getAttribute('open'), '');
  assert.equal(await page.locator('#project-costs').getAttribute('open'), '');
  await page.emulateMedia({ media: 'print' });
  assert.equal(await page.locator('.customer-meaning').isVisible(), true);
  assert.equal(await page.locator('#sun-help').isVisible(), true);
  await page.pdf({ path: '/tmp/helio-guidance-report.pdf', format: 'A4', printBackground: true });
  await page.emulateMedia({ media: 'screen' });
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await page.locator('.start-guide').screenshot({ path: '/tmp/helio-guidance-mobile.png' });
  await page.locator('.customer-meaning').screenshot({ path: '/tmp/helio-summary-mobile.png' });
  await page.locator('#review-clear').click();
  assert.equal(await page.locator('.customer-meaning').isVisible(), false);
  assert.deepEqual(errors, []);
  console.log('PASS: guide navigation; advanced settings collapsed and editable; invalid hidden settings revealed; positive, higher-cost and unchanged summaries; consumption versus solar explanation; zero-upgrade case; stale results hidden; print assumptions; mobile layout.');
} finally {
  await browser?.close();
  server.closeAllConnections();
  await new Promise(resolve => server.close(resolve));
}
