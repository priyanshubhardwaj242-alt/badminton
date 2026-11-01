# Badminton Tournament Manager

A complete college badminton tournament system: three-court management, live scoring, brackets, registration, check-in, results, reports.

## Your website (GitHub Pages) - how to publish
1. In this repository, make sure `index.html` is at the **top level** (next to the `static` and `node-edition` folders), not inside another folder.
2. **Settings > Pages > Build and deployment**: Source = *Deploy from a branch*, Branch = `main`, Folder = `/ (root)`, then **Save**.
3. After 1-2 minutes open `https://YOUR-USERNAME.github.io/YOUR-REPO/`.
4. The first visit shows **Set up your tournament site**: choose an administrator username and password. That is all; there is nothing to install or run.

## Important: how this edition stores data
GitHub Pages cannot run a server, so this edition runs the complete system **inside the browser**. All tournament data (players, fixtures, scores, users) is stored in the browser of the device you use as the control desk.
- Use **one laptop/tablet as the control desk** (staff console, scoring). Open the **Live** or **Courts** page in a second tab or on a projector at the venue: it updates instantly.
- Phones and computers that open the link get their **own empty copy**, so spectators cannot follow scores on their own devices with this edition. For that you need the server edition (below).
- **Download a backup often** (Staff console > Backup & data) and never clear the browser's site data. A backup restores on any device.
- Accounts and passwords protect the screens, but the data sits in the browser itself, so treat the control-desk device as trusted.

## Server edition (`node-edition/`)
The same system as a real Node.js server with a shared database, so any phone can watch live scores. See `node-edition/README.md` (run it on a laptop with `start-windows.bat`, in GitHub Codespaces, or on a Node host). It also contains the automated tests (`npm test`).

## Layout
| Path | What it is |
|---|---|
| `index.html`, `static/` | The browser edition that GitHub Pages serves (pre-built; no build step needed) |
| `node-edition/` | Server edition, tests, and the source for the browser edition (`node-edition/tools/static`) |
| `.github/workflows/test.yml` | Runs the tests on every push |

Third-party code in `static/vendor`: [sql.js](https://github.com/sql-js/sql.js) (SQLite compiled to WebAssembly, MIT license).
