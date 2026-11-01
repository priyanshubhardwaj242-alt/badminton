// One-step launcher: checks Node, creates the administrator on first run, then starts the website.
// Used by start-windows.bat and start-mac-linux.command (or run: npm run launch)
const { spawnSync, spawn } = require('node:child_process');
const path = require('node:path');
const [major, minor] = process.versions.node.split('.').map(Number);
if (major < 22 || (major === 22 && minor < 13)) {
  console.error(`\nThis program needs Node.js 22.13 or newer, but you have ${process.versions.node}.\nInstall the current "LTS" version from https://nodejs.org , then run this again.\n`);
  process.exit(1);
}
const root = path.join(__dirname, '..'), flags = ['--disable-warning=ExperimentalWarning'];
const cfg = require('../src/config'); const { open } = require('../src/db');
const db = open(cfg.dbPath); const hasAdmin = !!db.prepare("SELECT 1 FROM users WHERE role='admin'").get(); db.close();
if (!hasAdmin) {
  console.log('\nFirst run: let us create your administrator account (you will use it to sign in).\n');
  const r = spawnSync(process.execPath, [...flags, path.join(__dirname, 'create-admin.js')], { stdio: 'inherit', cwd: root });
  if (r.status !== 0) { console.error('\nAdministrator was not created. Run this again to retry.'); process.exit(1); }
}
console.log('\nStarting the website... (keep this window open; close it or press Ctrl+C to stop)\n');
const srv = spawn(process.execPath, [...flags, path.join(root, 'src', 'server.js')], { stdio: 'inherit', cwd: root });
srv.on('exit', code => process.exit(code || 0));
process.on('SIGINT', () => srv.kill('SIGINT'));
