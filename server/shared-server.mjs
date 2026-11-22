import { createServer } from 'node:http';
import { DatabaseSync } from 'node:sqlite';
import { randomBytes, randomUUID, createHash, scryptSync, timingSafeEqual, createCipheriv, createDecipheriv } from 'node:crypto';
import { mkdirSync, chmodSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { dirname, resolve, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateReferralRecord, recordReferralStage, trackingToday, trackingServices } from '../referral-tracking.js';
import { referralVendors } from '../referral-vendors.js';
import { matchReferralVendors } from '../referrals.js';
const hash = value => createHash('sha256').update(value).digest('hex');
const token = () => randomBytes(32).toString('base64url');
const businessToday = () => trackingToday('America/Los_Angeles');
const root = fileURLToPath(new URL('..', import.meta.url));
const failure = (code, message) => Object.assign(new Error(message), { status: code });
export function createSharedServer({ dbPath, password, encryptionKey, origin, vendors = referralVendors } = {}) {
  const enabled = Boolean(password && password.length >= 16 && encryptionKey && Buffer.from(encryptionKey, 'base64').length === 32 && origin);
  let db;
  if (enabled) {
    mkdirSync(dirname(dbPath), { recursive: true, mode: 0o700 });
    db = new DatabaseSync(dbPath); chmodSync(dbPath, 0o600);
    db.exec(`PRAGMA foreign_keys=ON; PRAGMA journal_mode=DELETE;
      CREATE TABLE IF NOT EXISTS referrals(id TEXT PRIMARY KEY, data TEXT NOT NULL, revision INTEGER NOT NULL, vendor_id TEXT);
      CREATE TABLE IF NOT EXISTS contacts(refid TEXT PRIMARY KEY REFERENCES referrals(id) ON DELETE CASCADE, encrypted TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS grants(refid TEXT PRIMARY KEY REFERENCES referrals(id) ON DELETE CASCADE, hash TEXT NOT NULL, expires INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS sessions(hash TEXT PRIMARY KEY, scope TEXT NOT NULL, refid TEXT REFERENCES referrals(id) ON DELETE CASCADE, grant_hash TEXT, expires INTEGER NOT NULL);`);
  }
  const salt = randomBytes(32);
  const passwordDigest = enabled ? scryptSync(password, salt, 64) : null;
  const secretKey = enabled ? Buffer.from(encryptionKey, 'base64') : null;
  const limits = new Map();
  function limit(key, count, interval) {
    const now = Date.now();
    if (limits.size > 10000) for (const [k, v] of limits) if (v.until < now) limits.delete(k);
    if (limits.size > 10000) throw failure(429, 'Please try again later.');
    const item = limits.get(key);
    if (!item || item.until < now) { limits.set(key, { count: 1, until: now + interval }); return; }
    if (++item.count > count) throw failure(429, 'Too many attempts. Please try again later.');
  }
  function encrypt(value) { const iv = randomBytes(12); const cipher = createCipheriv('aes-256-gcm', secretKey, iv); const bytes = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]); return [iv, cipher.getAuthTag(), bytes].map(b => b.toString('base64')).join('.'); }
  function decrypt(value) { const [iv, tag, bytes] = value.split('.').map(s => Buffer.from(s, 'base64')); const cipher = createDecipheriv('aes-256-gcm', secretKey, iv); cipher.setAuthTag(tag); return Buffer.concat([cipher.update(bytes), cipher.final()]).toString('utf8'); }
  function session(req, scope) {
    const cookies = Object.fromEntries((req.headers.cookie || '').split(';').map(part => part.trim().split('=')));
    const raw = cookies[scope === 'team' ? 'helio_team' : 'helio_vendor'];
    if (!raw || !/^[a-zA-Z0-9_-]{43}$/.test(raw)) throw failure(401, 'Please sign in again.');
    const row = db.prepare('SELECT * FROM sessions WHERE hash=? AND scope=? AND expires>?').get(hash(raw), scope, Date.now());
    if (!row) throw failure(401, 'Please sign in again.');
    if (scope === 'vendor' && !db.prepare('SELECT refid FROM grants WHERE refid=? AND hash=? AND expires>?').get(row.refid, row.grant_hash, Date.now())) throw failure(401, 'This vendor link expired or was revoked.');
    return row;
  }
  function getRecord(id) { const row = db.prepare('SELECT * FROM referrals WHERE id=?').get(id); if (!row) throw failure(404, 'Referral not found.'); return { ...JSON.parse(row.data), revision: row.revision }; }
  function putRecord(raw, previous, expectedRevision) {
    const { history, revision, ...fields } = raw;
    let record;
    try { record = recordReferralStage(validateReferralRecord(fields, businessToday()), previous, undefined, businessToday()); } catch (error) { throw failure(400, error.message); }
    if (previous) {
      if (!Number.isInteger(expectedRevision) || expectedRevision !== previous.revision) throw failure(409, 'Someone updated this referral. Your edit was not saved. Cancel editing, refresh and reapply your changes.');
      db.exec('BEGIN IMMEDIATE');
      try {
        const result = db.prepare('UPDATE referrals SET data=?, revision=revision+1 WHERE id=? AND revision=?').run(JSON.stringify(record), record.id, expectedRevision);
        if (!result.changes) throw failure(409, 'Referral changed. Refresh before editing again.');
        if (record.vendor !== previous.vendor) {
          db.prepare('DELETE FROM grants WHERE refid=?').run(record.id);
          db.prepare("DELETE FROM sessions WHERE refid=? AND scope='vendor'").run(record.id);
        }
        db.exec('COMMIT');
      } catch (error) { db.exec('ROLLBACK'); throw error; }
    } else db.prepare('INSERT INTO referrals(id,data,revision) VALUES(?,?,1)').run(record.id, JSON.stringify(record));
    return getRecord(record.id);
  }
  async function body(req) {
    if (!(req.headers['content-type'] || '').startsWith('application/json')) throw failure(415, 'Use JSON for this request.');
    let text = ''; for await (const chunk of req) { text += chunk; if (Buffer.byteLength(text) > 65536) throw failure(413, 'Request is too large.'); }
    try { const value = JSON.parse(text); if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(); return value; } catch { throw failure(400, 'Invalid request.'); }
  }
  const server = createServer(async (req, res) => {
    let expectedOrigin;
    try {
      expectedOrigin = typeof origin === 'function' ? origin() : origin;
      if (expectedOrigin) {
        const parsed = new URL(expectedOrigin);
        if ((parsed.protocol !== 'https:' && !(parsed.protocol === 'http:' && ['127.0.0.1', 'localhost', '[::1]'].includes(parsed.hostname))) || parsed.origin !== expectedOrigin) throw failure(503, 'Server origin must use HTTPS, except localhost.');
        if (req.headers.host !== parsed.host) throw failure(403, 'Unexpected server address.');
      }
      res.setHeader('X-Content-Type-Options', 'nosniff'); res.setHeader('Referrer-Policy', 'no-referrer'); res.setHeader('Cache-Control', 'no-store');
      res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'; worker-src 'self' blob:; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'self'; form-action 'self'");
      const requestUrl = new URL(req.url, 'http://local');
      const path = requestUrl.pathname;
      const json = (status, data) => { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(data)); };
      const issueSession = (scope, refid = null, grantHash = null, expiry = Date.now() + 8 * 3600000) => {
        db.prepare('DELETE FROM sessions WHERE expires<?').run(Date.now());
        const raw = token(); db.prepare('INSERT INTO sessions VALUES(?,?,?,?,?)').run(hash(raw), scope, refid, grantHash, expiry);
        const secure = expectedOrigin.startsWith('https:') ? '; Secure' : '';
        res.setHeader('Set-Cookie', `${scope === 'team' ? 'helio_team' : 'helio_vendor'}=${raw}; HttpOnly; SameSite=Strict; Path=${scope === 'team' ? '/api' : '/api/vendor'}; Max-Age=${Math.max(0, Math.floor((expiry - Date.now()) / 1000))}${secure}`);
      };
      if (path === '/api/config' && req.method === 'GET') return json(200, { enabled, today: businessToday(), vendors: enabled ? vendors.filter(v => Object.keys(trackingServices).some(service => matchReferralVendors([v], 'bakersfield-ca', service).length)).map(v => ({ id: v.id, name: v.name, services: v.services })) : [] });
      if (path.startsWith('/api/')) {
        if (!enabled) throw failure(503, 'Shared tracking is not configured on this server. Local tools remain available.');
        if (!['GET', 'HEAD'].includes(req.method) && req.headers.origin !== expectedOrigin) throw failure(403, 'Request origin was not accepted.');
        if (path === '/api/login' && req.method === 'POST') {
          limit(`login:${req.socket.remoteAddress}`, 10, 15 * 60000);
          const data = await body(req); const provided = typeof data.password === 'string' && data.password.length <= 256 ? data.password : '';
          if (!timingSafeEqual(scryptSync(provided, salt, 64), passwordDigest)) throw failure(401, 'The team password was not accepted.');
          issueSession('team'); return json(200, { ok: true });
        }
        if (path === '/api/public/referrals' && req.method === 'POST') {
          limit(`public:${req.socket.remoteAddress}`, 10, 3600000);
          const data = await body(req);
          const vendor = vendors.find(v => v.id === data.vendorId && matchReferralVendors([v], data.area, data.service).length);
          if (!vendor || !Object.hasOwn(trackingServices, data.service)) throw failure(400, 'Choose a listed provider and supported service area.');
          if (data.consent !== true || typeof data.email !== 'string' || data.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) throw failure(400, 'A valid contact email and your permission to share it are required.');
          const record = recordReferralStage(validateReferralRecord({ id: randomUUID(), vendor: vendor.name, stage: 'referred', referred: businessToday(), service: data.service, rating: null, nextAction: 'contact' }, businessToday()), null, undefined, businessToday());
          db.exec('BEGIN IMMEDIATE');
          try { db.prepare('INSERT INTO referrals VALUES(?,?,1,?)').run(record.id, JSON.stringify(record), vendor.id); db.prepare('INSERT INTO contacts VALUES(?,?)').run(record.id, encrypt(data.email.trim())); db.exec('COMMIT'); } catch (error) { db.exec('ROLLBACK'); throw error; }
          return json(201, { id: record.id, message: 'Referral recorded for the team. No appointment is booked and no email has been sent.' });
        }
        if (path === '/api/vendor/session' && req.method === 'POST') {
          limit(`vendor:${req.socket.remoteAddress}`, 30, 15 * 60000);
          const data = await body(req);
          if (typeof data.token !== 'string' || !/^[a-zA-Z0-9_-]{43}$/.test(data.token)) throw failure(401, 'Invalid or expired vendor link.');
          const grant = db.prepare('SELECT * FROM grants WHERE hash=? AND expires>?').get(hash(data.token), Date.now());
          if (!grant) throw failure(401, 'Invalid or expired vendor link.');
          issueSession('vendor', grant.refid, grant.hash, Math.min(grant.expires, Date.now() + 8 * 3600000)); return json(200, { ok: true, id: grant.refid });
        }
        if (path === '/api/vendor/referral') {
          const access = session(req, 'vendor');
          if (requestUrl.searchParams.has('ref') && requestUrl.searchParams.get('ref') !== access.refid) throw failure(403, 'This tab belongs to a different referral. Reopen its private link.');
          const previous = getRecord(access.refid);
          const vendorView = record => ({ id: record.id, service: record.service || '', vendor: record.vendor, stage: record.stage, referred: record.referred, contacted: record.contacted, consultation: record.consultation || '', quoteDate: record.quoteDate || '', installed: record.installed, closedDate: record.closedDate || '', closeReason: record.closeReason || '', revision: record.revision, email: (() => { const contact = db.prepare('SELECT encrypted FROM contacts WHERE refid=?').get(record.id); return contact ? decrypt(contact.encrypted) : null; })() });
          if (req.method === 'GET') return json(200, vendorView(previous));
          if (req.method === 'PATCH') {
            const data = await body(req);
            if (data.confirmed !== true) throw failure(400, 'Confirm the status and dates before submitting.');
            if (data.id !== previous.id) throw failure(409, 'This tab belongs to a different referral. Reopen its private link before saving.');
            const allowed = { referred: ['contacted', 'scheduled', 'quoted', 'installed', 'closed'], contacted: ['contacted', 'scheduled', 'quoted', 'installed', 'closed'], scheduled: ['scheduled', 'quoted', 'installed', 'closed'], quoted: ['quoted', 'installed', 'closed'], installed: ['installed'], closed: ['closed'] };
            if (!allowed[previous.stage].includes(data.stage)) throw failure(400, 'That stage change requires a team member.');
            const fields = Object.fromEntries(['stage', 'contacted', 'consultation', 'quoteDate', 'installed', 'closedDate', 'closeReason'].filter(key => Object.hasOwn(data, key)).map(key => [key, data[key]]));
            const record = putRecord({ ...previous, ...fields }, previous, data.revision); return json(200, vendorView(record));
          }
          throw failure(405, 'Method not supported.');
        }
        const access = session(req, 'team');
        if (path === '/api/logout' && req.method === 'POST') { db.prepare('DELETE FROM sessions WHERE hash=?').run(access.hash); res.setHeader('Set-Cookie', `helio_team=; HttpOnly; SameSite=Strict; Path=/api; Max-Age=0${expectedOrigin.startsWith('https:') ? '; Secure' : ''}`); return json(200, { ok: true }); }
        if (path === '/api/referrals' && req.method === 'GET') return json(200, { today: businessToday(), records: db.prepare('SELECT data,revision FROM referrals ORDER BY rowid').all().map(row => ({ ...JSON.parse(row.data), revision: row.revision })) });
        if (path === '/api/referrals' && req.method === 'POST') { const data = await body(req); return json(201, putRecord({ ...data.record, id: randomUUID() }, null)); }
        const match = path.match(/^\/api\/referrals\/([a-zA-Z0-9-]{1,64})(\/link)?$/);
        if (match) {
          const previous = getRecord(match[1]);
          if (match[2]) {
            if (req.method === 'DELETE') { db.prepare('DELETE FROM grants WHERE refid=?').run(previous.id); db.prepare("DELETE FROM sessions WHERE refid=? AND scope='vendor'").run(previous.id); return json(200, { ok: true }); }
            if (req.method === 'POST') { const raw = token(); const expires = Date.now() + 7 * 86400000; db.prepare('INSERT OR REPLACE INTO grants VALUES(?,?,?)').run(previous.id, hash(raw), expires); return json(200, { url: `${expectedOrigin}/vendor-update.html#token=${raw}`, expires: new Date(expires).toISOString() }); }
          } else if (req.method === 'PUT') { const data = await body(req); return json(200, putRecord({ ...data.record, id: previous.id }, previous, data.revision)); }
          else if (req.method === 'DELETE') { const data = await body(req); if (data.revision !== previous.revision) throw failure(409, 'Referral changed. Refresh before deleting.'); const deleted = db.prepare('DELETE FROM referrals WHERE id=? AND revision=?').run(previous.id, data.revision); if (!deleted.changes) throw failure(409, 'Referral changed. Refresh before deleting.'); return json(200, { ok: true }); }
        }
        throw failure(404, 'API endpoint not found.');
      }
      if (!['GET', 'HEAD'].includes(req.method)) throw failure(405, 'Method not supported.');
      const file = path === '/' ? 'index.html' : decodeURIComponent(path.slice(1));
      if (!['index.html', 'vendor-tracker.html', 'vendor-update.html'].includes(file) && !/^vendor\/ocr\/[a-zA-Z0-9_.-]+$/.test(file)) throw failure(404, 'Page not found.');
      let bytes; try { bytes = await readFile(resolve(root, file)); } catch { throw failure(404, 'Page not found.'); }
      const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.wasm': 'application/wasm', '.gz': 'application/gzip', '.json': 'application/json', '.txt': 'text/plain' };
      res.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream' }); res.end(req.method === 'HEAD' ? undefined : bytes);
    } catch (error) { if (!res.headersSent) { res.writeHead(error.status || 500, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end(JSON.stringify({ error: error.status ? error.message : 'The server could not complete this request.' })); } else res.end(); }
  });
  return { server, enabled, close: () => { server.closeAllConnections(); return new Promise(resolveClose => server.close(() => { db?.close(); resolveClose(); })); } };
}
