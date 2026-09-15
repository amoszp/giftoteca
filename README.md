# Giftoteca 🎁

A personal **Progressive Web App (PWA)** for organizing gift ideas by person and occasion.

Giftoteca provides a simple way to keep track of birthdays, Christmas gifts, and general gift ideas, including purchase status and reference links.

## ✨ Features

- 🎂 **Upcoming birthdays** — birthdays sorted by proximity.
- 🎁 **Gift ideas by person** — keep ideas organized for each person.
- 🎄 **Occasions** — categorize gifts as:
  - Birthday
  - Christmas
  - General idea
- ✅ **Purchase tracking** — mark gifts as purchased without hiding or striking them out.
- 🔗 **Reference links** — optionally attach a URL to each gift idea.
- 👤 **People management** — create, edit, and delete people and their birthdays.
- 📱 **PWA** — installable on iOS and other supported devices.
- 💾 **Local-first storage** — data is stored locally using IndexedDB.
- ✏️ **Full CRUD** — create, edit, and delete people and gifts.

## 🛠️ Tech Stack

- [React](https://react.dev/)
- [Vite](https://vite.dev/)
- [React Router](https://reactrouter.com/)
- [Dexie](https://dexie.org/)
- [dexie-react-hooks](https://github.com/dexie/Dexie.js)
- [vite-plugin-pwa](https://vite-pwa-org.netlify.app/)
- [Lucide React](https://lucide.dev/)

## 🎨 Design

Giftoteca uses a **Liquid Glass** visual style focused on a clean, tactile mobile experience.

- Translucent glass surfaces with backdrop blur
- Ambient animated background
- Subtle interaction and press feedback
- Animated glass-style checkboxes
- Consistent spacing, typography, radii, and icon sizing
- Touch targets designed around a minimum **44px** interaction area

Purchased gifts remain fully visible and are identified with a **Purchased** label instead of being crossed out.

## 🗃️ Data Model

### `people`

```js
{
  id,
  name,
  birthday
}
```

`birthday` is stored as `YYYY-MM-DD`. The year is not used when calculating upcoming birthdays, making birthdays recurring annually.

### `gifts`

```js
{
  id,
  personId,
  occasion,
  title,
  link,
  bought,
  createdAt
}
```

`occasion` can be:

```text
cumpleanos
navidad
idea
```

## 📱 Screens

### Home

Shows upcoming birthdays ordered by proximity, including:

- Person avatar
- Days remaining
- Urgency indicator
- Gift purchase progress

### Birthdays

Browse people and view their birthday gift ideas.

### Christmas

Browse people and view their Christmas gift ideas.

### Ideas

View all gift ideas grouped by person and separated into:

- Birthday
- Christmas
- General ideas

### Settings

Manage people and their birthday information.

## 💾 Storage

Giftoteca uses **IndexedDB** through Dexie for local data persistence.

There is currently:

- No backend
- No authentication
- No cloud database
- No cross-device synchronization

This keeps the application simple and privacy-friendly, with data remaining on the user's device.

> **Note:** Because data is stored locally, clearing the browser/site storage can remove Giftoteca's data. A backup/synchronization solution may be added in the future.

## 🚀 Development

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

To access the development version from another device on the same network:

```bash
npm run dev -- --host
```

Then open the displayed local network URL from the other device.

## 📦 Production Build

Create a production build with:

```bash
npm run build
```

Preview the production build locally:

```bash
npm run preview
```

## 🗺️ Roadmap

- [ ] Production deployment
- [ ] Permanent PWA installation
- [ ] Data backup/export
- [ ] Optional cross-device synchronization
- [ ] Additional gift organization features

## 📄 License

License information to be added.