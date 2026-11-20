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
  await page.goto(origin + 'vendor-tracker.html');
  await page.evaluate(() => localStorage.setItem('helio-home:progress:v1', 'unrelated'));
  const today = await page.locator('[name=referred]').inputValue();
  await page.locator('[name=vendor]').fill('Synthetic <provider>');
  await page.locator('[name=followup]').fill(today);
  await page.locator('#tracker-form [type=submit]').click();
  assert.equal(await page.locator('#tracker-records tr').count(), 1);
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
  await page.locator('#tracker-save').click();
  const backup = await page.evaluate(() => localStorage.getItem('helio-home:referral-tracker:v1'));
  assert.equal(JSON.parse(backup).records.length, 1);
  await page.reload(); assert.equal(await page.locator('#tracker-records tr').count(), 0);
  await page.locator('#tracker-load').click(); assert.equal(await page.locator('#tracker-records tr').count(), 1);
  const downloadPromise = page.waitForEvent('download'); await page.locator('#tracker-export').click();
  const download = await downloadPromise;
  assert.deepEqual(JSON.parse(await readFile(await download.path(), 'utf8')), JSON.parse(backup));
  await page.locator('#tracker-file').setInputFiles({ name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from('{"version":8}') });
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
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  assert.deepEqual(errors, []);
  console.log('PASS: add/edit/delete, event validation, performance totals, literal business names, opt-in save, load, backup/import, rejected corrupt import, isolated deletion, mobile.');
} finally {
  await browser?.close(); server.closeAllConnections(); await new Promise(resolve => server.close(resolve));
}
