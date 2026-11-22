// Real backend + separate customer, team and vendor browser sessions. Synthetic data only.
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { once } from 'node:events';
import { randomBytes } from 'node:crypto';
import { createSharedServer } from '../server/shared-server.mjs';
const directory = await mkdtemp(join(tmpdir(), 'helio-browser-shared-'));
let origin;
const password = 'synthetic-browser-password';
const vendors = [{ id: 'synthetic', name: 'Synthetic provider', areas: ['bakersfield-ca'], services: ['solar'], website: 'https://example.test/' }];
const app = createSharedServer({ dbPath: join(directory, 'test.sqlite'), password, encryptionKey: randomBytes(32).toString('base64'), origin: () => origin, vendors });
app.server.listen(0, '127.0.0.1'); await once(app.server, 'listening'); origin = `http://127.0.0.1:${app.server.address().port}`;
let browser;
try {
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', headless: true, args: ['--no-sandbox'] });
  const errors = [];
  async function newPage() { const context = await browser.newContext(); const page = await context.newPage(); page.on('pageerror', error => errors.push(error.message)); return page; }
  async function teamPage() {
    const page = await newPage(); await page.goto(origin + '/vendor-tracker.html');
    await page.locator('#tracker-login input').fill(password); await page.locator('#tracker-login button').click();
    await page.waitForFunction(() => document.querySelector('#tracker-login').hidden);
    assert.equal(await page.locator('#tracker-save').isDisabled(), true); return page;
  }
  const team1 = await teamPage(); const team2 = await teamPage();
  const customer = await newPage();
  await customer.route(origin + '/', async route => { const response = await route.fetch(); await route.fulfill({ response, body: (await response.text()).replace('const referralVendors = [];', `const referralVendors = ${JSON.stringify(vendors)};`) }); });
  await customer.goto(origin + '/');
  for (let i = 0; i < 12; i++) { await customer.locator(`#bill-kwh-${i}`).fill('100'); await customer.locator(`#bill-cost-${i}`).fill('20'); }
  await customer.locator('#referral-details > summary').click();
  await customer.selectOption('#referral-area', 'bakersfield-ca'); await customer.selectOption('#referral-service', 'solar');
  await customer.getByRole('button', { name: 'Request a tracked referral' }).click();
  const dialog = customer.locator('dialog[open]');
  await dialog.getByLabel('Contact email', { exact: true }).fill('synthetic-customer@example.test');
  await dialog.getByRole('checkbox').check(); await dialog.getByRole('button', { name: 'Submit referral request' }).click();
  await customer.waitForFunction(() => [...document.querySelectorAll('dialog [role=status]')].some(el => el.textContent.includes('Referral reference:')));
  assert.equal(await dialog.locator('input[type=email]').inputValue(), '');
  assert.equal(await customer.evaluate(() => Object.values(localStorage).some(value => value.includes('synthetic-customer'))), false);
  await team1.waitForFunction(() => document.querySelectorAll('#tracker-records tr').length === 1, null, { timeout: 18000 });
  await team2.waitForFunction(() => document.querySelectorAll('#tracker-records tr').length === 1, null, { timeout: 18000 });
  await team1.getByRole('button', { name: 'Vendor link', exact: true }).click();
  await team1.waitForFunction(() => document.querySelector('#tracker-link-dialog').open);
  const privateLink = await team1.locator('#tracker-private-link').inputValue();
  assert.match(privateLink, /#token=/); await team1.locator('#tracker-link-close').click();
  await team1.waitForFunction(() => document.querySelector('#tracker-private-link').value === '');
  const vendor = await newPage(); await vendor.goto(privateLink);
  await vendor.waitForFunction(() => !document.querySelector('#vendor-details').hidden);
  assert.equal(new URL(vendor.url()).hash, '');
  assert.match(await vendor.locator('#vendor-contact').textContent(), /synthetic-customer@example.test/);
  const recordsResponse = await team1.request.get(origin + '/api/referrals');
  const record = (await recordsResponse.json()).records[0];
  await vendor.locator('[name=contacted]').fill(record.referred);
  await vendor.locator('[name=confirmed]').check(); await vendor.locator('#vendor-update-form button').click();
  await vendor.waitForFunction(() => document.querySelector('#vendor-status').textContent.includes('Update saved'));
  for (const page of [team1, team2]) await page.waitForFunction(() => document.querySelector('#tracker-vendor-totals tr')?.cells[2].textContent === '1', null, { timeout: 18000 });
  assert.match(await team1.locator('#tracker-response-chart').textContent(), /0.0 days/);
  // Two people edit the same revision. The older edit must be retained and rejected, never overwrite.
  await team1.getByRole('button', { name: /^Edit referral/ }).click();
  await team2.getByRole('button', { name: /^Edit referral/ }).click();
  await team2.locator('[name=owner]').fill('TEAM2'); await team2.locator('#tracker-form [type=submit]').click();
  await team2.waitForFunction(() => document.querySelector('#tracker-status').textContent === 'Saved to shared records.');
  await team1.locator('[name=owner]').fill('TEAM1'); await team1.locator('#tracker-form [type=submit]').click();
  await team1.waitForFunction(() => document.querySelector('#tracker-status').textContent.includes('Someone updated'));
  assert.equal(await team1.locator('[name=owner]').inputValue(), 'TEAM1');
  assert.equal((await (await team2.request.get(origin + '/api/referrals')).json()).records[0].owner, 'TEAM2');
  await team1.locator('#tracker-cancel').click();
  await team1.getByRole('button', { name: 'Revoke link', exact: true }).click();
  await team1.waitForFunction(() => document.querySelector('#tracker-status').textContent.includes('revoked'));
  await vendor.locator('[name=confirmed]').check(); await vendor.locator('#vendor-update-form button').click();
  await vendor.waitForFunction(() => document.querySelector('#vendor-status').textContent.includes('sign in') || document.querySelector('#vendor-status').textContent.includes('revoked'));
  assert.deepEqual(errors, []);
  console.log('PASS: consented customer referral, encrypted-contact workflow, private vendor page, automatic multi-client refresh, charts, conflicting edits retained, link revocation, no email in local storage.');
} finally { await browser?.close(); await app.close(); await rm(directory, { recursive: true, force: true }); }
