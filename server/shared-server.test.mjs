import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { once } from 'node:events';
import { randomBytes } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { createSharedServer } from './shared-server.mjs';

test('shared referrals authenticate, protect contacts, reject conflicts and isolate vendor links', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'helio-shared-'));
  const dbPath = join(directory, 'test.sqlite');
  let url; const password = 'synthetic-test-password-only'; const encryptionKey = randomBytes(32).toString('base64');
  const vendors = [{ id: 'synthetic', name: 'Synthetic provider', areas: ['bakersfield-ca'], services: ['solar'], website: 'https://example.test/' }];
  let app;
  async function start() { app = createSharedServer({ dbPath, password, encryptionKey, origin: () => url, vendors }); app.server.listen(0, '127.0.0.1'); await once(app.server, 'listening'); url = `http://127.0.0.1:${app.server.address().port}`; }
  async function call(path, method = 'GET', data, cookie, origin = url) {
    const response = await fetch(url + path, { method, headers: { ...(data ? { 'Content-Type': 'application/json', Origin: origin } : {}), ...(cookie ? { Cookie: cookie } : {}) }, body: data ? JSON.stringify(data) : undefined });
    const text = await response.text(); let body; try { body = JSON.parse(text); } catch { body = text; }
    return { status: response.status, body, cookie: response.headers.get('set-cookie')?.split(';')[0], headers: response.headers };
  }
  try {
    await start();
    assert.equal((await call('/api/config')).body.enabled, true);
    assert.equal((await call('/api/referrals')).status, 401);
    assert.equal((await call('/.env')).status, 404);
    assert.equal((await call('/server/shared-server.mjs')).status, 404);
    assert.equal((await call('/api/login', 'POST', { password }, null, 'https://other.example')).status, 403);
    assert.equal((await call('/api/login', 'POST', { password: 'incorrect' })).status, 401);
    const login = await call('/api/login', 'POST', { password }); assert.equal(login.status, 200);
    assert.match(login.headers.get('set-cookie'), /HttpOnly; SameSite=Strict/);
    const team = login.cookie;
    const tomorrow = new Date(Date.parse((await call('/api/config')).body.today) + 86400000).toISOString().slice(0, 10);
    assert.equal((await call('/api/referrals', 'POST', { record: { vendor: 'Synthetic future', stage: 'referred', referred: tomorrow } }, team)).status, 400);
    const request = { vendorId: 'synthetic', area: 'bakersfield-ca', service: 'solar', email: 'synthetic-homeowner@example.test', consent: true, billImage: 'private image not accepted', owner: 'attacker' };
    assert.equal((await call('/api/public/referrals', 'POST', { ...request, consent: false })).status, 400);
    assert.equal((await call('/api/public/referrals', 'POST', { ...request, vendorId: 'unknown' })).status, 400);
    const created = await call('/api/public/referrals', 'POST', request); assert.equal(created.status, 201);
    const id = created.body.id;
    const records = (await call('/api/referrals', 'GET', null, team)).body.records;
    assert.equal(records.length, 1); assert.equal(records[0].stage, 'referred'); assert.equal(records[0].history.length, 1);
    assert.equal(records[0].owner, undefined); assert.equal(records[0].email, undefined); assert.equal(records[0].billImage, undefined);
    assert.equal((await readFile(dbPath)).includes(Buffer.from(request.email)), false);
    const updated = await call(`/api/referrals/${id}`, 'PUT', { record: { ...records[0], owner: 'TEAM1' }, revision: 1 }, team); assert.equal(updated.status, 200);
    assert.equal((await call(`/api/referrals/${id}`, 'PUT', { record: { ...records[0], owner: 'TEAM2' }, revision: 1 }, team)).status, 409);
    const link = await call(`/api/referrals/${id}/link`, 'POST', {}, team); assert.equal(link.status, 200);
    const grant = new URL(link.body.url).hash.slice(7);
    assert.equal((await call('/api/vendor/referral')).status, 401);
    const vendorLogin = await call('/api/vendor/session', 'POST', { token: grant }); assert.equal(vendorLogin.status, 200);
    const vendor = vendorLogin.cookie;
    const view = await call('/api/vendor/referral', 'GET', null, vendor); assert.equal(view.body.email, request.email); assert.equal(view.body.owner, undefined); assert.equal(view.body.rating, undefined);
    assert.equal((await call('/api/referrals', 'GET', null, vendor)).status, 401);
    assert.equal((await call('/api/vendor/referral', 'PATCH', { stage: 'contacted', revision: view.body.revision, contacted: view.body.referred }, vendor)).status, 400);
    const progressed = await call('/api/vendor/referral', 'PATCH', { id, stage: 'contacted', contacted: view.body.referred, revision: view.body.revision, confirmed: true, owner: 'HACK', rating: 5 }, vendor);
    assert.equal(progressed.status, 200);
    const after = (await call('/api/referrals', 'GET', null, team)).body.records[0]; assert.equal(after.owner, 'TEAM1'); assert.equal(after.rating, null); assert.equal(after.history.at(-1).stage, 'contacted');
    assert.equal((await call('/api/vendor/referral', 'PATCH', { id, stage: 'installed', installed: view.body.referred, revision: view.body.revision, confirmed: true }, vendor)).status, 409);
    const manual = await call('/api/referrals', 'POST', { record: { vendor: 'Other provider', stage: 'referred', referred: view.body.referred } }, team); assert.equal(manual.status, 201);
    assert.notEqual(manual.body.id, after.id);
    assert.equal((await call('/api/vendor/referral?ref=' + manual.body.id, 'GET', null, vendor)).status, 403);
    assert.equal((await call('/api/vendor/referral', 'PATCH', { id: manual.body.id, stage: 'contacted', contacted: view.body.referred, revision: after.revision, confirmed: true }, vendor)).status, 409);
    const manualLink = await call(`/api/referrals/${manual.body.id}/link`, 'POST', {}, team);
    const manualVendor = (await call('/api/vendor/session', 'POST', { token: new URL(manualLink.body.url).hash.slice(7) })).cookie;
    assert.equal((await call(`/api/referrals/${manual.body.id}`, 'PUT', { record: { ...manual.body, vendor: 'Reassigned provider' }, revision: 1 }, team)).status, 200);
    assert.equal((await call('/api/vendor/referral', 'GET', null, manualVendor)).status, 401);

    assert.equal((await call('/api/vendor/referral', 'GET', null, vendor)).body.id, after.id);
    const rotated = await call(`/api/referrals/${id}/link`, 'POST', {}, team); assert.equal(rotated.status, 200);
    assert.equal((await call('/api/vendor/referral', 'GET', null, vendor)).status, 401);
    assert.equal((await call('/api/vendor/session', 'POST', { token: grant })).status, 401);
    const newGrant = new URL(rotated.body.url).hash.slice(7);
    const newVendor = (await call('/api/vendor/session', 'POST', { token: newGrant })).cookie;
    assert.equal((await call(`/api/referrals/${id}/link`, 'DELETE', {}, team)).status, 200);
    assert.equal((await call('/api/vendor/referral', 'GET', null, newVendor)).status, 401);
    const expiredLink = await call(`/api/referrals/${id}/link`, 'POST', {}, team);
    const checkDb = new DatabaseSync(dbPath); checkDb.prepare('UPDATE grants SET expires=0 WHERE refid=?').run(id); checkDb.close();
    assert.equal((await call('/api/vendor/session', 'POST', { token: new URL(expiredLink.body.url).hash.slice(7) })).status, 401);
    await app.close(); await start();
    const persistedTeam = (await call('/api/login', 'POST', { password })).cookie;
    assert.equal((await call('/api/referrals', 'GET', null, persistedTeam)).body.records.length, 2);
    assert.equal((await call('/api/logout', 'POST', {}, persistedTeam)).status, 200);
    assert.equal((await call('/api/referrals', 'GET', null, persistedTeam)).status, 401);
  } finally { await app?.close(); await rm(directory, { recursive: true, force: true }); }
});

test('unconfigured servers preserve static tools and reject shared writes', async () => {
  const app = createSharedServer(); app.server.listen(0, '127.0.0.1'); await once(app.server, 'listening');
  const url = `http://127.0.0.1:${app.server.address().port}`;
  try { assert.equal((await (await fetch(url + '/api/config')).json()).enabled, false); assert.equal((await fetch(url + '/api/referrals')).status, 503); }
  finally { await app.close(); }
});
