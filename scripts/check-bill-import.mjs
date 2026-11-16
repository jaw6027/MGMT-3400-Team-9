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
 const page=await browser.newPage({viewport:{width:1280,height:1000}});
 page.setDefaultTimeout(90000);
 const errors=[];const requests=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('request',r=>requests.push({url:r.url(),method:r.method()}));
 await page.goto(origin);
 const fixture = async blank => Buffer.from(await page.evaluate(blank => {
   const canvas = document.createElement('canvas');
   canvas.width = 1600; canvas.height = 950;
   const context = canvas.getContext('2d');
   context.fillStyle = '#fff'; context.fillRect(0, 0, canvas.width, canvas.height);
   context.font = '36px Arial'; context.fillStyle = '#000';
   if (!blank) ['SAMPLE ELECTRICITY BILL - TEST DATA ONLY', 'Name: SYNTHETIC RESIDENT', 'Account: TEST-1234', 'Address: 123 SAMPLE STREET', 'Billing month: November 2026', 'Total usage: 1,234.50 kWh', 'Total amount due: $253.46'].forEach((line, i) => context.fillText(line, 70, 80 + i * 105));
   return canvas.toDataURL('image/png').split(',')[1];
 }, blank), 'base64');
 const bill = { name: 'synthetic-bill.png', mimeType: 'image/png', buffer: await fixture(false) };
 const blank = { name: 'blank.png', mimeType: 'image/png', buffer: await fixture(true) };
 assert.equal(await page.locator('#annual-savings').textContent(),'$1,256');
 await page.locator('#bill-image').setInputFiles(bill);
 await page.waitForFunction(()=>!document.querySelector('#bill-import-form').hidden);
 assert.equal(await page.locator('#import-month').inputValue(),'10');
 assert.equal(await page.locator('#import-kwh').inputValue(),'1234.5');
 assert.equal(await page.locator('#import-cost').inputValue(),'253.46');
 assert.equal(await page.locator('#bill-image').evaluate(el=>el.files.length),0);
 assert.equal(await page.locator('#bill-kwh-10').inputValue(),'');
 assert.equal(await page.locator('#bill-import-confirm').isDisabled(),true);
 assert.doesNotMatch(await page.locator('body').textContent(),/SYNTHETIC RESIDENT|TEST-1234|SAMPLE STREET/);
 await page.locator('#import-kwh').fill('1250');
 await page.locator('#bill-reviewed').check();
 await page.locator('#bill-import-confirm').click();
 assert.equal(await page.locator('#bill-kwh-10').inputValue(),'1250');
 assert.equal(await page.locator('#bill-cost-10').inputValue(),'253.46');
 await page.locator('#bill-image').setInputFiles(bill);
 await page.waitForFunction(()=>!document.querySelector('#bill-import-form').hidden);
 assert.equal(await page.locator('#bill-replace-label').isVisible(),true);
 await page.locator('#bill-reviewed').check();
 assert.equal(await page.locator('#bill-import-confirm').isDisabled(),true);
 await page.locator('#bill-replace').check();
 assert.equal(await page.locator('#bill-import-confirm').isEnabled(),true);
 await page.locator('#import-cost').fill('250');
 assert.equal(await page.locator('#bill-reviewed').isChecked(),false);
 await page.locator('#bill-reviewed').check();
 await page.locator('#bill-import-confirm').click();
 assert.equal(await page.locator('#bill-cost-10').inputValue(),'250');
 assert.equal(await page.locator('#bill-kwh-0').inputValue(),'');
 await page.locator('#bill-image').setInputFiles(blank);
 await page.waitForFunction(()=>!document.querySelector('#bill-import-form').hidden);
 assert.equal(await page.locator('#import-month').inputValue(),'');
 assert.equal(await page.locator('#import-kwh').inputValue(),'');
 assert.equal(await page.locator('#import-cost').inputValue(),'');
 assert.equal(await page.locator('#bill-import-form .uncertain').count(),3);
 await page.setViewportSize({width:390,height:844});
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 await page.locator('#import-month').selectOption('0');
 await page.locator('#import-kwh').fill('0');
 await page.locator('#import-cost').fill('15');
 await page.locator('#bill-reviewed').check();
 await page.locator('#bill-import-confirm').click();
 assert.equal(await page.locator('#bill-kwh-0').inputValue(),'0');
 assert.equal(await page.locator('#bill-cost-0').inputValue(),'15');
 await page.locator('#bill-image').setInputFiles(bill);
 await page.locator('#bill-import-cancel').click();
 await page.waitForTimeout(500);
 assert.equal(await page.locator('#bill-import-dialog').isVisible(),false);
 assert.equal(await page.locator('#bill-cost-10').inputValue(),'250');
 assert.equal(await page.locator('#bill-import-status').textContent(),'');
 await page.locator('#bill-image').setInputFiles({ name: 'test.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF test') });
 await page.waitForFunction(()=>!document.querySelector('#bill-import-form').hidden);
 assert.match(await page.locator('#bill-import-status').textContent(), /PDFs.*not supported/);
 await page.locator('#bill-import-cancel').click();
 await page.locator('#bill-image').setInputFiles({ name: 'broken.png', mimeType: 'image/png', buffer: Buffer.from('not an image') });
 await page.waitForFunction(()=>!document.querySelector('#bill-import-form').hidden);
 assert.match(await page.locator('#bill-import-status').textContent(), /could not be read/);
 await page.locator('#bill-import-cancel').click();
 assert.equal(await page.evaluate(()=>localStorage.length),0);
 assert.equal(await page.evaluate(()=>sessionStorage.length),0);
 assert.deepEqual(await page.evaluate(async()=>await indexedDB.databases()),[]);
 assert.equal(requests.every(r=>r.method==='GET'&&r.url.startsWith(origin)),true);
 assert.deepEqual(errors,[]);
 console.log('PASS: real local OCR image to correct fields; manual corrections; no insertion before approval; overwrite confirmation; blank image warnings; manual zero values; cancellation; mobile dialog; no raw PII in DOM; no local/session/IndexedDB storage; GET-only same-origin assets; no image transmission.');

} finally {
  await browser?.close();
  server.closeAllConnections();
  await new Promise(resolve => server.close(resolve));
}
