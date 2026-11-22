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

export async function getSetting(key, fallback) {
  const row = await db.settings.get(key)
  return row ? row.value : fallback
}
export async function setSetting(key, value) {
  return db.settings.put({ key, value })
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
  await db.gifts.where('occasion').equals(k).modify({ occasion: 'sin' })
  await setSetting('occasions', { ...stored, custom: (stored.custom || []).filter((c) => c.k !== k) })
  return async () => {
    const now = await getSetting('occasions', {})
    await setSetting('occasions', { ...now, custom: [...(now.custom || []), removed] })
    await db.gifts.where('id').anyOf(moved).modify({ occasion: k })
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
  return db.people.add({ name, birthday: birthday || null, about: emptyAbout() })
}
export async function updatePerson(id, changes) {
  return db.people.update(id, changes)
}
// Returns an undo function.
export async function deletePerson(id) {
  const person = await db.people.get(id)
  const gifts = await db.gifts.where('personId').equals(id).toArray()
  await db.transaction('rw', db.people, db.gifts, async () => {
    await db.gifts.where('personId').equals(id).delete()
    await db.people.delete(id)
  })
  return () =>
    db.transaction('rw', db.people, db.gifts, async () => {
      await db.people.add(person)
      await db.gifts.bulkAdd(gifts)
    })
}

/* ---------- gifts ---------- */

export async function addGift({ personId, occasion, title, link, photo }) {
  return db.gifts.add({
    personId,
    occasion,
    title,
    link: link || '',
    photo: photo || null,
    bought: false,
    boughtAt: null,
    givenYear: null,
    createdAt: Date.now(),
  })
}
export async function updateGift(id, changes) {
  return db.gifts.update(id, changes)
}
export async function setBought(id, bought) {
  return db.gifts.update(id, { bought, boughtAt: bought ? Date.now() : null })
}
export async function deleteGift(id) {
  const gift = await db.gifts.get(id)
  await db.gifts.delete(id)
  return () => db.gifts.add(gift)
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
  const bought = await db.gifts.filter((g) => g.bought && !g.givenYear).toArray()
  const updates = []
  for (const g of bought) {
    const o = occasions.find((x) => x.k === g.occasion)
    if (!o || o.k === 'sin') continue
    const since = new Date(g.boughtAt || g.createdAt || Date.now())
    since.setHours(0, 0, 0, 0)
    const due = nextOccurrence(o, byId.get(g.personId), since)
    if (due && due.date < today) updates.push({ id: g.id, year: due.date.getFullYear() })
  }
  await Promise.all(updates.map((u) => db.gifts.update(u.id, { givenYear: u.year })))
  return updates.length
}

/* ---------- backup ---------- */

export async function exportData() {
  const [people, gifts, settings] = await Promise.all([db.people.toArray(), db.gifts.toArray(), db.settings.toArray()])
  return { app: 'giftoteca', version: 2, exportedAt: new Date().toISOString(), people, gifts, settings }
}
export async function importData(data) {
  if (!data || data.app !== 'giftoteca' || !Array.isArray(data.people) || !Array.isArray(data.gifts)) {
    throw new Error('Este archivo no es una copia de Giftoteca.')
  }
  await db.transaction('rw', db.people, db.gifts, db.settings, async () => {
    await Promise.all([db.people.clear(), db.gifts.clear(), db.settings.clear()])
    await db.people.bulkAdd(data.people.map((p) => ({ ...p, about: p.about || emptyAbout() })))
    await db.gifts.bulkAdd(data.gifts.map((g) => ({ ...g, occasion: g.occasion === 'idea' ? 'sin' : g.occasion })))
    if (Array.isArray(data.settings)) await db.settings.bulkAdd(data.settings)
  })
}
// Returns an undo function.
export async function deleteAllData() {
  const snapshot = await exportData()
  await db.transaction('rw', db.people, db.gifts, db.settings, async () => {
    await Promise.all([db.people.clear(), db.gifts.clear(), db.settings.clear()])
  })
  return () => importData(snapshot)
}
