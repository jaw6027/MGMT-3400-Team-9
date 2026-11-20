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
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(origin);
  assert.equal(await page.locator('#referral-details').getAttribute('open'), null);
  await page.locator('#referral-details > summary').click();
  assert.deepEqual(await page.locator('#referral-service option').evaluateAll(nodes => nodes.map(n => n.value)), ['assessment']);
  assert.equal(await page.locator('#referral-discovery').isVisible(), false);
  await page.selectOption('#referral-area', 'bakersfield-ca');
  assert.match(await page.locator('#referral-status').textContent(), /No matching providers are listed/);
  await page.locator('#review-example').click();
  assert.equal(await page.locator('#referral-example').isVisible(), true);
  await page.selectOption('#referral-service', 'solar');
  assert.equal(await page.locator('#referral-discovery').isVisible(), true);
  assert.match(await page.locator('#referral-search').getAttribute('href'), /Rooftop\+solar/);
  assert.equal(await page.locator('#referral-search').getAttribute('referrerpolicy'), 'no-referrer');
  assert.equal(await page.locator('#referral-price-guide').getAttribute('open'), null);
  assert.match(await page.locator('#referral-reason').textContent(), /kWh.year/);
  await page.selectOption('#referral-area', 'other');
  assert.equal(await page.locator('#referral-search').getAttribute('href'), null);
  assert.equal(await page.locator('#referral-discovery').isVisible(), false);
  assert.match(await page.locator('#referral-status').textContent(), /covers Bakersfield only/);
  // Synthetic test directory is injected into the test response only.
  const fixture = [{ id: 'synthetic', name: 'Synthetic <provider>', areas: ['bakersfield-ca'], services: ['solar'], phone: '202-555-0100', email: 'hello@example.test', website: 'https://example.test/' }];
  await page.route(origin, async route => {
    const html = (await readFile(resolve(root, 'index.html'), 'utf8')).replace('const referralVendors = [];', 'const referralVendors = ' + JSON.stringify(fixture).replaceAll('<', '\\u003c') + ';');
    await route.fulfill({ contentType: 'text/html', body: html });
  });
  await page.reload();
  await page.locator('#referral-details > summary').click();
  await page.selectOption('#referral-area', 'bakersfield-ca');
  assert.equal(await page.locator('#referral-list li').count(), 0);
  await page.locator('#review-example').click();
  await page.selectOption('#referral-service', 'solar');
  assert.equal(await page.locator('#referral-list h4').textContent(), 'Synthetic <provider>');
  assert.match(await page.locator('#referral-list').textContent(), /Price: request a written quote/);
  assert.match(await page.locator('#referral-status').textContent(), /not ranked by quality or price/);
  assert.equal(await page.locator('#referral-list a[href="tel:+12025550100"]').count(), 1);
  assert.equal(await page.locator('#referral-list a[href="mailto:hello@example.test"]').count(), 1);
  assert.equal(await page.locator('#referral-list a[target="_blank"]').getAttribute('rel'), 'noopener noreferrer');
  await page.locator('#home-ownership').evaluate(element => {
    element.value = 'renter'; element.dispatchEvent(new Event('input', { bubbles: true }));
  });
  assert.deepEqual(await page.locator('#referral-service option').evaluateAll(nodes => nodes.map(n => n.value)), ['assessment', 'community']);
  assert.equal(await page.locator('#referral-list li').count(), 0);
  await page.locator('#home-existingSolar').evaluate(element => {
    element.value = 'yes'; element.dispatchEvent(new Event('input', { bubbles: true }));
  });
  assert.deepEqual(await page.locator('#referral-service option').evaluateAll(nodes => nodes.map(n => n.value)), ['assessment', 'maintenance']);
  assert.equal(await page.evaluate(() => localStorage.length), 0);
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  assert.deepEqual(errors, []);
  console.log('PASS: collapsed finder, demand-based services, area filtering, honest empty directory, example label, safe public contacts, literal provider names, no automatic storage, mobile.');
} finally {
  await browser?.close();
  server.closeAllConnections();
  await new Promise(resolve => server.close(resolve));
}
