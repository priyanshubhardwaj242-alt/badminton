// Runs the whole API test-suite against the sql.js database wrapper (what the browser edition uses). Needs `npm install` in this folder.
const { spawnSync } = require('node:child_process'); const path = require('node:path');
const r = spawnSync(process.execPath, ['--disable-warning=ExperimentalWarning', '--test', '--test-timeout=120000', path.join(__dirname, '..', '..', 'tests', 'api.test.js')],
  { stdio: 'inherit', env: { ...process.env, TEST_BACKEND: 'sqljs', SQLJS_FACTORY: path.join(__dirname, 'sqljs-db.js') } });
process.exit(r.status);
