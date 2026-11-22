# Giftoteca 🎁

A **Progressive Web App (PWA)** for keeping gift ideas organized by person and occasion, with everything stored on your own device.

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
- 💾 **Backup** — export everything (photos included) to a JSON file and import it back.
- 📱 **PWA** — installable on iOS and other supported devices.

## 🛠️ Tech Stack

- [React](https://react.dev/)
- [Vite](https://vite.dev/)
- [React Router](https://reactrouter.com/)
- [Dexie](https://dexie.org/) and [dexie-react-hooks](https://github.com/dexie/Dexie.js)
- [vite-plugin-pwa](https://vite-pwa-org.netlify.app/)
- [Lucide React](https://lucide.dev/)

## 🎨 Design

- One accent colour, a fixed spacing scale (4/8 px), three icon sizes and 44 px touch targets.
- Each occasion has its own colour, chosen to stay distinguishable for colour-blind users in both themes.
- Icons are only used for actions, never as decoration.
- A 78 px bottom navigation fixed to the screen edge.
- Destructive actions are red, separated at the end of each screen, and undoable.

## 🗃️ Data Model

IndexedDB through Dexie (schema version 2).

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

### `settings`

Key/value rows: `occasions` (which optional occasions are on, plus custom ones) and `prefs` (theme, how many days ahead a date is highlighted).

Upgrading from version 1 converts the old `idea` occasion to `sin` and adds the new fields.

## 🚀 Development

```bash
npm install
npm run dev            # or: npm run dev -- --host  (to open it from another device)
npm run lint
npm run build
npm run preview
```

## 🐳 Deployment

A multi-stage `Dockerfile` builds the app with Node and serves `dist/` with Nginx (`nginx.conf` adds the client-side routing fallback and keeps the service worker uncached, so installed copies pick up new releases).

Every push to `master` builds the image with GitHub Actions and publishes it to GitHub Container Registry. `docker-compose.yml` runs that prebuilt image:

```bash
docker compose pull
docker compose up -d
```

The app is served on port `1107` (change the left side of `ports` to use another). Pair it with a container auto-updater such as Watchtower to pick up new images automatically.

## 💾 Storage

There is no backend, no account and no sync: data stays on the device. Clearing the browser's site data removes it, so use **Ajustes → Exportar copia** now and then.

## 🗺️ Roadmap

- [ ] Optional cross-device synchronization

## 📄 License

License information to be added.
