// Starts the app. In the browser edition it waits for the in-browser database and offers first-time setup.
(async () => {
  if (window.StaticEngine) {
    try { await window.StaticEngine.ready; const s = await App.api('GET', '/api/setup-status'); if (s.needed) location.hash = '#/setup'; }
    catch (e) { document.getElementById('main').textContent = 'Could not start the browser database: ' + e.message; return; }
  }
  App.start();
})();
