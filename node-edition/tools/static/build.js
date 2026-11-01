// Builds the browser edition into <repo>/static. Run:  cd node-edition/tools/static && npm install && npm run build
const esbuild = require('esbuild'), path = require('node:path'), fs = require('node:fs');
const nodeEdition = path.resolve(__dirname, '..', '..'), site = path.resolve(nodeEdition, '..'), out = path.join(site, 'static');
const S = f => path.join(__dirname, 'src', f);
const shims = { 'node:crypto': S('crypto-shim.js'), 'node:http': S('http-shim.js'), 'node:path': S('path-shim.js'), 'node:fs': S('stub.js'), 'node:os': S('stub.js'), 'node:child_process': S('stub.js'), 'node:sqlite': S('stub.js') };
const plugin = { name: 'browser-shims', setup(b) {
  b.onResolve({ filter: /^node:/ }, a => shims[a.path] ? { path: shims[a.path] } : { errors: [{ text: 'No browser shim for ' + a.path }] });
  b.onResolve({ filter: /^\.\/(config|db)$/ }, a => a.importer.startsWith(path.join(nodeEdition, 'src')) ? { path: S(a.path === './config' ? 'config-browser.js' : 'db-browser.js') } : undefined);
} };
(async () => {
  fs.mkdirSync(path.join(out, 'vendor'), { recursive: true });
  await esbuild.build({ entryPoints: [S('engine.js')], bundle: true, minify: true, format: 'iife', platform: 'browser', target: 'es2020', outfile: path.join(out, 'engine.js'),
    inject: [S('inject.js')], plugins: [plugin], define: { __dirname: '"/"', __filename: '"/x"', 'process.env.NODE_ENV': '"production"' }, legalComments: 'none', logLevel: 'info', nodePaths: [path.join(__dirname, 'node_modules')] });
  const dist = path.join(__dirname, 'node_modules', 'sql.js', 'dist');
  for (const f of ['sql-wasm.js', 'sql-wasm.wasm']) fs.copyFileSync(path.join(dist, f), path.join(out, 'vendor', f));
  const pub = path.join(nodeEdition, 'public');
  for (const f of ['style.css', 'app.js', 'admin.js', 'boot.js']) fs.copyFileSync(path.join(pub, f), path.join(out, f));
  fs.copyFileSync(path.join(__dirname, 'static-ui.js'), path.join(out, 'static-ui.js'));
  fs.writeFileSync(path.join(site, 'index.html'), fs.readFileSync(path.join(__dirname, 'index.template.html'), 'utf8'));
  console.log('Built browser edition into', out);
})().catch(e => { console.error(e); process.exit(1); });
