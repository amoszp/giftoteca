import { useLiveQuery } from 'dexie-react-hooks'
import { db, getSetting, mergeOccasions, DEFAULT_PREFS } from '../db'

const byName = (a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' })

// One place to read everything the screens need.
export function useData() {
  const people = useLiveQuery(() => db.people.toArray(), [])
  const gifts = useLiveQuery(() => db.gifts.toArray(), [])
  const occStored = useLiveQuery(() => getSetting('occasions', {}), [])
  const prefsStored = useLiveQuery(() => getSetting('prefs', DEFAULT_PREFS), [])
  const ready = people !== undefined && gifts !== undefined && occStored !== undefined && prefsStored !== undefined
  const occasions = mergeOccasions(occStored)
  const all = gifts || []
  return {
    ready,
    people: (people || []).slice().sort(byName),
    gifts: all.filter((g) => !g.givenYear),
    past: all.filter((g) => g.givenYear),
    occasions,
    active: occasions.filter((o) => o.on),
    occ: (k) => occasions.find((o) => o.k === k),
    prefs: { ...DEFAULT_PREFS, ...(prefsStored || {}) },
  }
}

// "ok" = something bought, "todo" = ideas but nothing bought, "none" = no ideas.
export function stateOf(gifts, personId, k) {
  const list = gifts.filter((g) => g.personId === personId && g.occasion === k)
  if (!list.length) return 'none'
  return list.some((g) => g.bought) ? 'ok' : 'todo'
}

export function progress(list) {
  if (!list.length) return 'Sin ideas'
  const b = list.filter((g) => g.bought).length
  if (list.length === 1) return b ? 'Comprada' : '1 idea, sin comprar'
  return b ? `${b} de ${list.length} compradas` : `${list.length} ideas, ninguna comprada`
}

export function domain(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}
