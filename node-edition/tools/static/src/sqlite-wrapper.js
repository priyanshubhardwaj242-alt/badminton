// Makes a sql.js database look like node:sqlite's DatabaseSync (prepare().get/all/run and exec), so the server code runs unchanged.
const bindError = () => Object.assign(new TypeError('Provided value cannot be bound to SQLite parameter'), { code: 'ERR_INVALID_ARG_TYPE' });
function norm(params) {
  for (const v of params) { if (v === null || typeof v === 'string' || typeof v === 'number' || typeof v === 'bigint' || v instanceof Uint8Array) continue; throw bindError(); }
  return params;
}
function wrap(raw) {
  const self = {
    raw,
    swap(r) { self.raw = r; },
    exec(sql) { self.raw.run(sql); },
    prepare(sql) {
      return {
        get: (...p) => { const st = self.raw.prepare(sql); try { st.bind(norm(p)); return st.step() ? st.getAsObject() : undefined; } finally { st.free(); } },
        all: (...p) => { const st = self.raw.prepare(sql); try { st.bind(norm(p)); const out = []; while (st.step()) out.push(st.getAsObject()); return out; } finally { st.free(); } },
        run: (...p) => { self.raw.run(sql, norm(p)); return { changes: self.raw.getRowsModified(), lastInsertRowid: self.raw.exec('SELECT last_insert_rowid()')[0].values[0][0] }; },
      };
    },
    close() { self.raw.close(); },
  };
  return self;
}
module.exports = { wrap };
