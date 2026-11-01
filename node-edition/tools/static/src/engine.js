// Browser edition engine: runs the real server code (src/server.js + core.js) inside the page, on a sql.js database
// that is saved to IndexedDB. window.fetch / EventSource are replaced so the unchanged front end talks to it.
window.STATIC_MODE = true;
const { wrap } = require('./sqlite-wrapper');
const { init } = require('../../../src/schema');
const { createApp, hashPassword } = require('../../../src/server');
const C = require('../../../src/core');

const DB_NAME = 'bm-tournament', STORE = 'kv';
let idbPromise = null;
const idb = () => idbPromise || (idbPromise = new Promise((res, rej) => { const r = indexedDB.open(DB_NAME, 1); r.onupgradeneeded = () => r.result.createObjectStore(STORE); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }));
const kvGet = async k => { const d = await idb(); return new Promise((res, rej) => { const q = d.transaction(STORE).objectStore(STORE).get(k); q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error); }); };
const kvSet = async obj => { const d = await idb(); return new Promise((res, rej) => { const t = d.transaction(STORE, 'readwrite'); for (const [k, v] of Object.entries(obj)) t.objectStore(STORE).put(v, k); t.oncomplete = () => res(); t.onerror = () => rej(t.error); t.onabort = () => rej(t.error); }); };
const withLock = fn => (typeof navigator !== 'undefined' && navigator.locks) ? navigator.locks.request('bm-db', fn) : fn();

let SQL, db, app, version = null;
const open = bytes => { const raw = bytes ? new SQL.Database(bytes) : new SQL.Database(); raw.run('PRAGMA foreign_keys=ON'); return raw; };
async function persist() { // save the whole database; sql.js resets pragmas on export so re-enable them
  const bytes = db.raw.export(); db.raw.run('PRAGMA foreign_keys=ON');
  version = Date.now() + ':' + Math.random().toString(36).slice(2); await kvSet({ db: bytes, version });
}
// Compare-and-swap save: only writes if nobody else (another tab) saved since we loaded; otherwise reports a conflict.
async function persistIfUnchanged(expected) {
  const bytes = db.raw.export(); db.raw.run('PRAGMA foreign_keys=ON'); const next = Date.now() + ':' + Math.random().toString(36).slice(2), d = await idb();
  return new Promise(resolve => {
    const t = d.transaction(STORE, 'readwrite'), st = t.objectStore(STORE), g = st.get('version');
    g.onsuccess = () => { if ((g.result ?? null) !== (expected ?? null)) t.abort(); else { st.put(bytes, 'db'); st.put(next, 'version'); } };
    t.oncomplete = () => { version = next; resolve(true); }; t.onabort = () => resolve(false); t.onerror = () => resolve(false);
  });
}
async function sync() { // another tab may have written: reload its copy first
  const v = await kvGet('version');
  if (v !== version) { const bytes = await kvGet('db'); if (bytes) { db.swap(open(bytes)); version = v; } }
}

const bus = new Set(), channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('bm-updates') : null;
const notify = () => { for (const e of bus) if (e.onmessage) e.onmessage({ data: 'update' }); };
if (channel) channel.onmessage = notify;
class FakeEventSource { constructor() { this.readyState = 1; bus.add(this); setTimeout(() => this.onopen && this.onopen({}), 0); } close() { bus.delete(this); } }
window.EventSource = FakeEventSource;

const sidKey = 'bm_sid', getSid = () => { try { return localStorage.getItem(sidKey) || ''; } catch { return ''; } };
const setSid = v => { try { v ? localStorage.setItem(sidKey, v) : localStorage.removeItem(sidKey); } catch {} };
const json = (status, obj) => new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json; charset=utf-8' } });
const adminCount = () => db.prepare("SELECT COUNT(*) n FROM users WHERE role='admin'").get().n;

async function dispatch(method, u, init_) {
  const body = init_ && init_.body != null ? String(init_.body) : '';
  if (u.pathname === '/api/setup-status') return json(200, { needed: adminCount() === 0 });
  if (u.pathname === '/api/setup' && method === 'POST') {
    if (adminCount() > 0) return json(409, { error: 'An administrator already exists' });
    let d; try { d = JSON.parse(body); } catch { return json(400, { error: 'Invalid request' }); }
    if (!/^[A-Za-z0-9_.-]{3,32}$/.test(d.username || '')) return json(422, { error: 'Username must be 3-32 characters: letters, digits, _ . -' });
    if (typeof d.password !== 'string' || d.password.length < 10) return json(422, { error: 'Password must be at least 10 characters' });
    const r = db.prepare('INSERT INTO users(username,password_hash,role) VALUES(?,?,?)').run(d.username, hashPassword(d.password), 'admin');
    C.audit(db, { id: Number(r.lastInsertRowid), username: d.username }, 'user.create_admin_setup', 'user', Number(r.lastInsertRowid), null, 'browser');
    return json(200, { ok: true });
  }
  const sid = getSid(), headers = { host: location.host, 'content-length': String(body.length) };
  if (sid) headers.cookie = 'sid=' + sid; if (body) headers['content-type'] = 'application/json';
  const req = { url: u.pathname + u.search, method, headers, socket: { remoteAddress: 'browser' }, on() {}, async *[Symbol.asyncIterator]() { if (body) yield Buffer.from(body); } };
  const out = {}; let status = 200; const chunks = []; let done; const finished = new Promise(r => { done = r; });
  const res = { setHeader(k, v) { out[k.toLowerCase()] = v; }, getHeader(k) { return out[k.toLowerCase()]; }, writeHead(s, h) { status = s; for (const k in h || {}) out[k.toLowerCase()] = h[k]; }, write(c) { chunks.push(c); return true; }, end(c) { if (c != null) chunks.push(c); done(); } };
  await app.handler(req, res); await finished;
  const sc = out['set-cookie']; if (sc) { const m = /^sid=([^;]*)/.exec(sc); if (m) setSid(m[1]); }
  const hdr = {}; for (const k of Object.keys(out)) if (k !== 'set-cookie' && k !== 'content-length') hdr[k] = out[k];
  const text = chunks.map(c => typeof c === 'string' ? c : Buffer.from(c).toString('utf8')).join('');
  return { res: new Response(text, { status, headers: hdr }), mutated: method !== 'GET' && status < 400 };
}

const ready = (async () => {
  SQL = await window.initSqlJs({ locateFile: f => new URL('static/vendor/' + f, document.baseURI).href });
  const saved = await kvGet('db'); version = (await kvGet('version')) ?? null;
  db = wrap(open(saved)); init(db);
  app = createApp(db, { production: false, cookieSecure: false, trustProxy: false });
  if (!saved) await persist();
})();

const realFetch = window.fetch ? window.fetch.bind(window) : null;
window.fetch = (input, init_) => {
  const u = new URL(typeof input === 'string' ? input : input.url, location.href);
  if (u.origin !== location.origin || !/^\/(api|print)\//.test(u.pathname)) { if (realFetch) return realFetch(input, init_); throw new Error('network unavailable'); }
  const method = ((init_ && init_.method) || 'GET').toUpperCase();
  return (async () => {
    await ready;
    return withLock(async () => {
      for (let attempt = 0; attempt < 5; attempt++) {
        await sync(); const based = version;
        const r = await dispatch(method, u, init_);
        if (r instanceof Response) return r;
        if (!r.mutated) return r.res;
        if (await persistIfUnchanged(based)) { if (channel) channel.postMessage('update'); notify(); return r.res; }
        // another tab saved first: our in-memory change is discarded by the next sync(), and we redo the action on the newest data
      }
      return json(409, { error: 'The data kept changing in another tab. Please try again.' });
    });
  })();
};

window.StaticEngine = {
  ready,
  get db() { return db; },
  exportDb: () => withLock(async () => { await sync(); const b = db.raw.export(); db.raw.run('PRAGMA foreign_keys=ON'); return b; }),
  importDb: bytes => withLock(async () => {
    let raw; try { raw = new SQL.Database(bytes); raw.exec('SELECT 1 FROM users LIMIT 1'); raw.exec('SELECT 1 FROM matches LIMIT 1'); } catch { throw new Error('This file is not a tournament backup.'); }
    raw.run('PRAGMA foreign_keys=ON'); init(wrap(raw)); db.swap(raw); setSid(''); await persist(); if (channel) channel.postMessage('update'); notify();
  }),
  reset: () => withLock(async () => { const raw = open(); init(wrap(raw)); db.swap(raw); setSid(''); await persist(); if (channel) channel.postMessage('update'); notify(); }),
};
