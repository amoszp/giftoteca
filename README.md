# Giftoteca 🎁

A **Progressive Web App (PWA)** for keeping gift ideas organized by person and occasion. It works offline on the device and syncs each account's data with its own small server.

## ✨ Features

- ⏳ **Countdown home** — days until the next shared occasion and who still needs a gift, followed by every upcoming date (birthdays included).
- 👤 **People** — each person has two tabs:
  - **Ideas**, grouped by occasion, with a bought toggle.
  - **Details** — name and birthday, sizes (shirt, trousers, shoes plus any custom size), likes, things to avoid, things they already have, notes, past gifts.
- 🔀 **Move ideas between occasions** — from an idea's card or while editing it, with undo.
- 📷 **Photos** — take a photo or pick one from the library; it is resized before saving.
- 🖼️ **Ideas gallery** — every idea as a photo grid, filtered by status and occasion.
- 🗓️ **Occasions** — Birthday, Christmas and "No occasion" are always on. Epiphany (Reyes), Mother's Day and Father's Day can be switched on, and you can add your own yearly dates.
- 🕰️ **Past gifts** — the day after an occasion, bought ideas move to the person's past gifts with the year.
- ↩️ **Undo** — moving, deleting an idea, deleting a person and clearing all data can be undone from the notice.
- 🌗 **Light and dark themes** — follows the system or a fixed choice.
- 🔐 **Accounts and sync** — sign in (or create an account) through a shared accounts service; data is stored per account on the server and on each device.
- 📴 **Offline-first** — the app always works from the device's copy; changes upload when the server is reachable (after each change, when the app comes back, every minute).
- 💾 **Backup** — export everything (photos included) to a JSON file and import it back.
- 📱 **PWA** — installable on iOS and other supported devices.

## 🛠️ Tech Stack

- [React](https://react.dev/)
- [Vite](https://vite.dev/)
- [React Router](https://reactrouter.com/)
- [Dexie](https://dexie.org/) and [dexie-react-hooks](https://github.com/dexie/Dexie.js)
- [vite-plugin-pwa](https://vite-pwa-org.netlify.app/)
- [Lucide React](https://lucide.dev/)
- Server: [Express](https://expressjs.com/) and Node's built-in `node:sqlite`

## 🎨 Design

- One accent colour, a fixed spacing scale (4/8 px), three icon sizes and 44 px touch targets.
- Each occasion has its own colour, chosen to stay distinguishable for colour-blind users in both themes.
- Icons are only used for actions, never as decoration.
- A 78 px bottom navigation fixed to the screen edge.
- Destructive actions are red, separated at the end of each screen, and undoable.

## 🗃️ Data Model

On the device: IndexedDB through Dexie (schema version 3). On the server: one SQLite table of records per account.

### `people`

```js
{ id, name, birthday, about: { sizes: [{ k, v, custom? }], likes: [], avoid: [], has: [], notes } }
```

`birthday` is `YYYY-MM-DD`; only month and day are used, so birthdays repeat every year.

### `gifts`

```js
{ id, personId, occasion, title, link, photo, bought, boughtAt, givenYear, createdAt }
```

- `occasion` — `cumpleanos`, `navidad`, `reyes`, `madre`, `padre`, `sin` or a custom occasion key.
- `photo` — a JPEG data URL (max 1200 px) or `null`.
- `givenYear` — set when a bought idea moves to past gifts.

Every synced record also carries `uid` (global id), `updatedAt`, `dirty` (not uploaded yet) and `deleted` (a tombstone, so deletes reach other devices). Gifts reference their person by `personUid`.

### `settings`

Key/value rows: `occasions` (which optional occasions are on, plus custom ones) and `prefs` (theme, how many days ahead a date is highlighted).

Upgrading from version 1 converts the old `idea` occasion to `sin` and adds the new fields; version 3 adds the sync fields and marks everything for upload.

## 🔄 Sync

- `POST /api/sync` takes `{ since, changes }` and returns `{ changes, seq, more }`: the client uploads its dirty records (in batches) and receives everything changed after `since`.
- The newest `updatedAt` wins, per record.
- The first sign-in on a device uploads what is already there. Signing out only happens once everything is uploaded, then the device's copy is cleared.
- Other endpoints: `POST /api/login`, `POST /api/signup`, `POST /api/logout`, `GET /api/me`, `GET /api/health`.

## 🚀 Development

```bash
npm install
npm run dev            # or: npm run dev -- --host  (to open it from another device)
npm run lint
npm run build

cd server
npm install
npm test               # sync rules
PORT=3000 ACCOUNTS_URL=http://localhost:4600 ACCOUNTS_SERVICE_TOKEN=... COOKIE_SECURE=false node index.js
```

The server serves `dist/` and the API on one port. It needs Node 22.13 or newer.

## 🐳 Deployment

A multi-stage `Dockerfile` builds the app and runs the Node server, which serves the app (routing fallback; `sw.js` and `index.html` never cached, so installed copies pick up new releases) and the API on port `3000`.

Every push to `master` builds the image with GitHub Actions and publishes it to GitHub Container Registry. `docker-compose.yml` runs that prebuilt image:

```bash
docker compose pull
docker compose up -d
```

The app is served on port `1107` (change the left side of `ports` to use another). It needs:

- a `.env` next to the compose file with `ACCOUNTS_SERVICE_TOKEN` for the accounts service;
- the external Docker network `accounts`, where the accounts service answers at `http://accounts:4600`;
- `./data`, writable by the container user, for the SQLite database.

Pair it with a container auto-updater such as Watchtower to pick up new images automatically.

## 💾 Storage

Each device keeps a full copy in IndexedDB, and signed-in accounts also keep one on the server, so clearing a device's site data loses nothing that was uploaded. **Ajustes → Exportar copia** still makes a file backup.

## 🗺️ Roadmap

- [x] Cross-device synchronization

## 📄 License

License information to be added.
