// Node-side factory used by the test-suite to run the SAME API tests against sql.js (the engine the browser edition uses).
const initSqlJs = require('sql.js'); const { wrap } = require('./src/sqlite-wrapper'); const { init } = require('../../src/schema');
exports.create = async () => { const SQL = await initSqlJs(); const raw = new SQL.Database(); raw.run('PRAGMA foreign_keys=ON'); return init(wrap(raw)); };
