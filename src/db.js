import Dexie from 'dexie'

export const db = new Dexie('giftoteca')

db.version(1).stores({
  people: '++id, name, birthday',
  gifts: '++id, personId, occasion, bought',
})

// v2: photos, bought/given dates, per-person details, settings table.
// The old "idea" occasion becomes "sin" (no occasion).
db.version(2)
  .stores({
    people: '++id, name, birthday',
    gifts: '++id, personId, occasion, bought',
    settings: 'key',
  })
  .upgrade(async (tx) => {
    await tx.table('gifts').toCollection().modify((g) => {
      if (g.occasion === 'idea') g.occasion = 'sin'
      if (g.photo === undefined) g.photo = null
      if (g.givenYear === undefined) g.givenYear = null
      if (g.bought && !g.boughtAt) g.boughtAt = g.createdAt || Date.now()
    })
    await tx.table('people').toCollection().modify((p) => {
      if (!p.about) p.about = emptyAbout()
    })
  })

// v3: sync. Every record gets a global uid, updatedAt, dirty (1 = not uploaded yet)
// and deleted (1 = tombstone, so other devices learn about the delete).
// Gifts point at their person by personUid too; personId stays as the local link.
db.version(3)
  .stores({
    people: '++id, name, birthday, &uid, dirty',
    gifts: '++id, personId, occasion, bought, &uid, dirty',
    settings: 'key',
  })
  .upgrade(async (tx) => {
    const now = Date.now()
    const uids = new Map()
    await tx.table('people').toCollection().modify((p) => {
      p.uid = newUid()
      uids.set(p.id, p.uid)
      Object.assign(p, { updatedAt: now, dirty: 1, deleted: 0 })
    })
    await tx.table('gifts').toCollection().modify((g) => {
      Object.assign(g, { uid: newUid(), personUid: uids.get(g.personId) || null, updatedAt: now, dirty: 1, deleted: 0 })
    })
    await tx.table('settings').toCollection().modify((s) => {
      if (s.key === 'occasions') Object.assign(s, { updatedAt: now, dirty: 1 })
    })
  })

// crypto.randomUUID needs a secure context; the LAN address is plain http.
export function newUid() {
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID()
  const b = crypto.getRandomValues(new Uint8Array(16))
  b[6] = (b[6] & 0x0f) | 0x40
  b[8] = (b[8] & 0x3f) | 0x80
  const h = [...b].map((x) => x.toString(16).padStart(2, '0')).join('')
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`
}

// Any local change: stamp it and mark it for upload.
const touch = (changes = {}) => ({ ...changes, updatedAt: Date.now(), dirty: 1 })

// Listeners (the sync engine) are told after every local write.
const writeListeners = new Set()
export const onLocalWrite = (fn) => (writeListeners.add(fn), () => writeListeners.delete(fn))
const changed = (result) => {
  writeListeners.forEach((fn) => fn())
  return result
}

/* ---------- occasions ---------- */

// col = colour slot (see index.css --o-*). Fixed ones can't be turned off.
export const DEFAULT_OCCASIONS = [
  { k: 'cumpleanos', label: 'Cumpleaños', col: 'm', fixed: true, on: true },
  { k: 'navidad', label: 'Navidad', col: 'y', md: '12-25', on: true },
  { k: 'reyes', label: 'Reyes', col: 'v', md: '01-06', on: false },
  { k: 'madre', label: 'Día de la Madre', col: 'a', rule: 'madre', on: false },
  { k: 'padre', label: 'Día del Padre', col: 'b', md: '03-19', on: false },
  { k: 'sin', label: 'Sin ocasión', fixed: true, on: true },
]

// Stored value: { on: { navidad: true, ... }, custom: [{ k, label, md, on }] }
export function mergeOccasions(stored) {
  const on = stored?.on || {}
  const base = DEFAULT_OCCASIONS.map((o) => (o.fixed || on[o.k] === undefined ? o : { ...o, on: on[o.k] }))
  const custom = (stored?.custom || []).map((c) => ({ ...c, col: 'r', custom: true }))
  const sin = base.pop()
  return [...base, ...custom, sin]
}

export const DEFAULT_PREFS = { theme: 'auto', soon: 7 }

// Settings that sync with the account ("prefs" stays per device).
export const SYNCED_SETTINGS = ['occasions']

export async function getSetting(key, fallback) {
  const row = await db.settings.get(key)
  return row ? row.value : fallback
}
export async function setSetting(key, value) {
  const row = SYNCED_SETTINGS.includes(key) ? touch({ key, value }) : { key, value }
  return changed(await db.settings.put(row))
}

export async function setOccasionOn(k, value) {
  const stored = await getSetting('occasions', {})
  const custom = (stored.custom || []).map((c) => (c.k === k ? { ...c, on: value } : c))
  const on = { ...(stored.on || {}) }
  if (!custom.some((c) => c.k === k)) on[k] = value
  return setSetting('occasions', { ...stored, on, custom })
}
export async function saveCustomOccasion({ k, label, md }) {
  const stored = await getSetting('occasions', {})
  const custom = [...(stored.custom || [])]
  if (k) {
    const i = custom.findIndex((c) => c.k === k)
    if (i >= 0) custom[i] = { ...custom[i], label, md }
  } else {
    custom.push({ k: 'c' + Date.now().toString(36), label, md, on: true })
  }
  return setSetting('occasions', { ...stored, custom })
}
export async function deleteCustomOccasion(k) {
  const stored = await getSetting('occasions', {})
  const removed = (stored.custom || []).find((c) => c.k === k)
  const moved = await db.gifts.where('occasion').equals(k).primaryKeys()
  await db.gifts.where('occasion').equals(k).modify(touch({ occasion: 'sin' }))
  await setSetting('occasions', { ...stored, custom: (stored.custom || []).filter((c) => c.k !== k) })
  return async () => {
    const now = await getSetting('occasions', {})
    await setSetting('occasions', { ...now, custom: [...(now.custom || []), removed] })
    await db.gifts.where('id').anyOf(moved).modify(touch({ occasion: k }))
    changed()
  }
}

/* ---------- people ---------- */

export const FIXED_SIZES = ['Camiseta', 'Pantalón', 'Calzado']
export function emptyAbout() {
  return { sizes: FIXED_SIZES.map((k) => ({ k, v: '' })), likes: [], avoid: [], has: [], notes: '' }
}
export function aboutOf(person) {
  return person?.about || emptyAbout()
}

export async function addPerson(name, birthday) {
  return changed(await db.people.add(touch({ uid: newUid(), name, birthday: birthday || null, about: emptyAbout(), deleted: 0 })))
}
export async function updatePerson(id, changes) {
  return changed(await db.people.update(id, touch(changes)))
}
// Tombstones the person and their ideas. Returns an undo function.
export async function deletePerson(id) {
  const giftIds = await db.gifts.where('personId').equals(id).filter((g) => !g.deleted).primaryKeys()
  await db.transaction('rw', db.people, db.gifts, async () => {
    await db.gifts.where('id').anyOf(giftIds).modify(touch({ deleted: 1 }))
    await db.people.update(id, touch({ deleted: 1 }))
  })
  changed()
  return async () => {
    await db.transaction('rw', db.people, db.gifts, async () => {
      await db.people.update(id, touch({ deleted: 0 }))
      await db.gifts.where('id').anyOf(giftIds).modify(touch({ deleted: 0 }))
    })
    changed()
  }
}

/* ---------- gifts ---------- */

export async function addGift({ personId, occasion, title, link, photo }) {
  const person = await db.people.get(personId)
  return changed(
    await db.gifts.add(
      touch({
        uid: newUid(),
        personId,
        personUid: person?.uid || null,
        occasion,
        title,
        link: link || '',
        photo: photo || null,
        bought: false,
        boughtAt: null,
        givenYear: null,
        createdAt: Date.now(),
        deleted: 0,
      })
    )
  )
}
export async function updateGift(id, changes) {
  return changed(await db.gifts.update(id, touch(changes)))
}
export async function setBought(id, bought) {
  return updateGift(id, { bought, boughtAt: bought ? Date.now() : null })
}
export async function deleteGift(id) {
  await updateGift(id, { deleted: 1 })
  return () => updateGift(id, { deleted: 0 })
}

/* ---------- dates ---------- */

const DAY = 864e5
export function startOfToday() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}
function firstSundayOfMay(year) {
  const d = new Date(year, 4, 1)
  d.setDate(1 + ((7 - d.getDay()) % 7))
  return d
}
// The occasion's date in a given year (null for "sin ocasión").
export function occasionDateInYear(o, year, person) {
  if (o.k === 'cumpleanos') {
    if (!person?.birthday) return null
    const [, m, d] = person.birthday.split('-').map(Number)
    return new Date(year, m - 1, d)
  }
  if (o.rule === 'madre') return firstSundayOfMay(year)
  if (o.md) {
    const [m, d] = o.md.split('-').map(Number)
    return new Date(year, m - 1, d)
  }
  return null
}
// Next occurrence (today counts) → { date, days } or null.
export function nextOccurrence(o, person, from = startOfToday()) {
  let d = occasionDateInYear(o, from.getFullYear(), person)
  if (!d) return null
  if (d < from) d = occasionDateInYear(o, from.getFullYear() + 1, person)
  return { date: d, days: Math.round((d - from) / DAY) }
}

export const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sept', 'oct', 'nov', 'dic']
const MONTHS_LONG = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
export const longDate = (d) => `${d.getDate()} de ${MONTHS_LONG[d.getMonth()]}`
export const daysText = (n) => (n === 0 ? 'Hoy' : n === 1 ? 'Mañana' : `en ${n} días`)

/* ---------- archive: bought ideas move to "Regalos anteriores" the day after their date ---------- */

export async function archivePastGifts(occasions) {
  const today = startOfToday()
  const people = await db.people.toArray()
  const byId = new Map(people.map((p) => [p.id, p]))
  const bought = await db.gifts.filter((g) => g.bought && !g.givenYear && !g.deleted).toArray()
  const updates = []
  for (const g of bought) {
    const o = occasions.find((x) => x.k === g.occasion)
    if (!o || o.k === 'sin') continue
    const since = new Date(g.boughtAt || g.createdAt || Date.now())
    since.setHours(0, 0, 0, 0)
    const due = nextOccurrence(o, byId.get(g.personId), since)
    if (due && due.date < today) updates.push({ id: g.id, year: due.date.getFullYear() })
  }
  await Promise.all(updates.map((u) => db.gifts.update(u.id, touch({ givenYear: u.year }))))
  if (updates.length) changed()
  return updates.length
}

/* ---------- backup ---------- */

const strip = ({ dirty, ...rest }) => rest // eslint-disable-line no-unused-vars

export async function exportData() {
  const [people, gifts, settings] = await Promise.all([
    db.people.filter((p) => !p.deleted).toArray(),
    db.gifts.filter((g) => !g.deleted).toArray(),
    db.settings.toArray(),
  ])
  return {
    app: 'giftoteca',
    version: 3,
    exportedAt: new Date().toISOString(),
    people: people.map(strip),
    gifts: gifts.map(strip),
    settings: settings.filter((s) => s.key === 'occasions' || s.key === 'prefs').map(strip),
  }
}

// Everything currently live becomes a tombstone (so the server and other devices drop it too).
async function tombstoneAll() {
  await db.people.filter((p) => !p.deleted).modify(touch({ deleted: 1 }))
  await db.gifts.filter((g) => !g.deleted).modify(touch({ deleted: 1 }))
}

// Replaces the live data with a backup (v2 or v3 file).
export async function importData(data) {
  if (!data || data.app !== 'giftoteca' || !Array.isArray(data.people) || !Array.isArray(data.gifts)) {
    throw new Error('Este archivo no es una copia de Giftoteca.')
  }
  await db.transaction('rw', db.people, db.gifts, db.settings, async () => {
    await tombstoneAll()
    const idMap = new Map() // id in the file -> local id
    const uidMap = new Map() // person uid -> local id
    for (const p of data.people) {
      const uid = p.uid || newUid()
      const row = touch({ name: p.name, birthday: p.birthday || null, about: p.about || emptyAbout(), uid, deleted: 0 })
      const existing = await db.people.where('uid').equals(uid).first()
      const id = existing ? (await db.people.update(existing.id, row), existing.id) : await db.people.add(row)
      idMap.set(p.id, id)
      uidMap.set(uid, id)
    }
    for (const g of data.gifts) {
      const personId = (g.personUid && uidMap.get(g.personUid)) || idMap.get(g.personId)
      if (!personId) continue
      const person = await db.people.get(personId)
      const uid = g.uid || newUid()
      const { id: _id, dirty: _d, ...rest } = g // eslint-disable-line no-unused-vars
      const row = touch({ ...rest, uid, personId, personUid: person.uid, occasion: g.occasion === 'idea' ? 'sin' : g.occasion, photo: g.photo ?? null, givenYear: g.givenYear ?? null, deleted: 0 })
      const existing = await db.gifts.where('uid').equals(uid).first()
      if (existing) await db.gifts.update(existing.id, row)
      else await db.gifts.add(row)
    }
    for (const s of data.settings || []) {
      if (s.key === 'occasions') await db.settings.put(touch({ key: s.key, value: s.value }))
      if (s.key === 'prefs') await db.settings.put({ key: s.key, value: s.value })
    }
  })
  changed()
}

// Returns an undo function.
export async function deleteAllData() {
  const people = await db.people.filter((p) => !p.deleted).primaryKeys()
  const gifts = await db.gifts.filter((g) => !g.deleted).primaryKeys()
  await db.transaction('rw', db.people, db.gifts, tombstoneAll)
  changed()
  return async () => {
    await db.transaction('rw', db.people, db.gifts, async () => {
      await db.people.where('id').anyOf(people).modify(touch({ deleted: 0 }))
      await db.gifts.where('id').anyOf(gifts).modify(touch({ deleted: 0 }))
    })
    changed()
  }
}

// Signing out or switching accounts: drop everything stored on this device.
export async function clearLocal() {
  await db.transaction('rw', db.people, db.gifts, db.settings, async () => {
    await Promise.all([db.people.clear(), db.gifts.clear()])
    await db.settings.where('key').anyOf(['occasions', 'sync', 'account']).delete()
  })
}
