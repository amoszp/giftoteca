import Dexie from 'dexie'

export const db = new Dexie('giftoteca')

db.version(1).stores({
  people: '++id, name, birthday',
  gifts: '++id, personId, occasion, bought',
})

export const OCCASIONS = {
  CUMPLEANOS: 'cumpleanos',
  NAVIDAD: 'navidad',
  IDEA: 'idea',
}

export const OCCASION_LABELS = {
  [OCCASIONS.CUMPLEANOS]: 'Cumpleaños',
  [OCCASIONS.NAVIDAD]: 'Navidad',
  [OCCASIONS.IDEA]: 'Ideas generales',
}

export async function addPerson(name, birthday) {
  return db.people.add({ name, birthday: birthday || null })
}

export async function updatePerson(id, changes) {
  return db.people.update(id, changes)
}

export async function deletePerson(id) {
  await db.gifts.where('personId').equals(id).delete()
  return db.people.delete(id)
}

export async function addGift(personId, occasion, title, link) {
  return db.gifts.add({
    personId,
    occasion,
    title,
    link: link || '',
    bought: false,
    createdAt: Date.now(),
  })
}

export async function updateGift(id, changes) {
  return db.gifts.update(id, changes)
}

export async function deleteGift(id) {
  return db.gifts.delete(id)
}

// birthday is stored as 'YYYY-MM-DD'; only month/day matter for recurrence
export function daysUntilNextBirthday(birthday) {
  if (!birthday) return null
  const [, month, day] = birthday.split('-').map(Number)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  let next = new Date(today.getFullYear(), month - 1, day)
  if (next < today) {
    next = new Date(today.getFullYear() + 1, month - 1, day)
  }
  const diffMs = next.getTime() - today.getTime()
  const days = Math.round(diffMs / (1000 * 60 * 60 * 24))
  return { days, date: next }
}

export function formatShortDate(date) {
  return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })
}
