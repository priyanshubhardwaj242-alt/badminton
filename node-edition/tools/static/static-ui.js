// Extra screens that only exist in the browser edition: first-time setup, backup/restore, and print/CSV handling.
(() => {
  const { h, api, field, toast } = window.App, App = window.App;
  App.pages.setup = { title: 'Set up', async render() {
    const s = await api('GET', '/api/setup-status');
    if (!s.needed) { location.hash = '#/login'; return h('p', {}, 'Already set up.'); }
    const msg = h('p', { class: 'err', role: 'alert' });
    return h('form', { class: 'form card', onsubmit: async e => {
      e.preventDefault(); const d = App.fd(e.target); msg.textContent = '';
      if (d.password !== d.password2) { msg.textContent = 'The two passwords do not match.'; return; }
      const btn = e.target.querySelector('button[type=submit]'); btn.disabled = true; btn.textContent = 'Creating...';
      try {
        await api('POST', '/api/setup', { username: d.username, password: d.password });
        await api('POST', '/api/auth/login', { username: d.username, password: d.password });
        App.me = (await api('GET', '/api/auth/me')).user;
        if (d.tournament_name) await api('PATCH', '/api/settings', { tournament_name: d.tournament_name });
        App.settings = (await api('GET', '/api/public/overview')).settings; document.getElementById('brand').textContent = App.settings.tournament_name;
        App.buildNav(); location.hash = '#/admin'; toast('Administrator created. Welcome!');
      } catch (er) { msg.textContent = er.message; btn.disabled = false; btn.textContent = 'Create administrator'; }
    } }, h('h1', {}, 'Set up your tournament site'), h('p', { class: 'muted' }, 'Create the administrator account. You will use it to sign in and run the tournament. Everything is stored in this browser.'),
      field('Tournament name', h('input', { name: 'tournament_name', maxlength: 120, placeholder: 'e.g. Spring Badminton Open' })),
      field('Administrator username', h('input', { name: 'username', required: true, minlength: 3, maxlength: 32, autocomplete: 'username' })),
      field('Password', h('input', { name: 'password', type: 'password', required: true, minlength: 10, autocomplete: 'new-password' }), 'At least 10 characters.'),
      field('Repeat password', h('input', { name: 'password2', type: 'password', required: true, minlength: 10, autocomplete: 'new-password' })), msg, h('br'),
      h('button', { class: 'primary', type: 'submit' }, 'Create administrator'));
  } };

  const download = (blob, name) => { const a = h('a', { href: URL.createObjectURL(blob), download: name }); document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000); };
  App.adminSections.data = async () => {
    const file = h('input', { type: 'file', accept: '.db,.sqlite,application/octet-stream', 'aria-label': 'Backup file' });
    return h('div', { class: 'stack' }, h('h1', {}, 'Backup & data'),
      h('div', { class: 'warn' }, 'This edition keeps all tournament data inside THIS browser on THIS device (IndexedDB). Other phones and computers open their own, empty copy. Clearing the browser\'s site data deletes the tournament. Download a backup often, especially before and after each session.'),
      h('div', { class: 'card stack' }, h('h2', {}, 'Download a backup'), h('p', { class: 'muted' }, 'Saves everything (players, fixtures, scores, users) as one file you can restore on any device.'),
        h('button', { class: 'primary', onclick: async () => { const b = await window.StaticEngine.exportDb(); download(new Blob([b], { type: 'application/octet-stream' }), `tournament-backup-${new Date().toISOString().slice(0, 10)}.db`); toast('Backup downloaded'); } }, 'Download backup')),
      h('div', { class: 'card stack' }, h('h2', {}, 'Restore from a backup'), h('p', { class: 'muted' }, 'Replaces ALL current data with the file you choose, and signs everyone out.'), file,
        h('button', { onclick: async () => { const f = file.files[0]; if (!f) return toast('Choose a backup file first', true);
          if (!(await App.confirm(`Replace all current data with "${f.name}"?`, 'Restore', true))) return;
          try { await window.StaticEngine.importDb(new Uint8Array(await f.arrayBuffer())); toast('Backup restored'); setTimeout(() => { location.hash = '#/login'; location.reload(); }, 600); } catch (e) { toast(e.message, true); } } }, 'Restore backup')),
      h('div', { class: 'card stack' }, h('h2', {}, 'Erase everything'), h('p', { class: 'muted' }, 'Deletes the whole tournament from this browser and starts again from the setup screen. Download a backup first.'),
        h('button', { class: 'danger', onclick: async () => { if (!(await App.confirm('Erase ALL tournament data in this browser? This cannot be undone.', 'Erase everything', true))) return;
          await window.StaticEngine.reset(); location.hash = '#/setup'; location.reload(); } }, 'Erase everything')),
      h('p', { class: 'muted small' }, 'Tip: for results and fixtures use the Reports page (CSV files and printable pages).'));
  };
  App.adminNav.push(['data', 'Backup & data', 'admin']);

  // Print pages and CSV exports are produced inside the browser as well.
  document.addEventListener('click', async ev => {
    const a = ev.target.closest && ev.target.closest('a[href]'); if (!a) return;
    const href = a.getAttribute('href'); if (!/^\/(print\/|api\/export\/)/.test(href)) return;
    ev.preventDefault(); const csv = href.startsWith('/api/export/'), w = csv ? null : window.open('', '_blank');
    try {
      const res = await fetch(href);
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || 'Not available'); }
      if (csv) { const cd = res.headers.get('content-disposition') || ''; download(await res.blob(), (/filename="([^"]+)"/.exec(cd) || [])[1] || 'export.csv'); }
      else { const html = await res.text(); w.document.open(); w.document.write(html); w.document.close(); }
    } catch (e) { if (w) w.close(); toast(e.message, true); }
  });
})();
