import { db, getSetting, onLocalWrite, SYNCED_SETTINGS } from '../db'

/*
 * Offline-first sync with the server.
 * - Local writes mark records dirty; we push them in batches.
 * - The server keeps one row per record and a sequence number; we pull everything after our last one.
 * - Conflicts: the newest updatedAt wins, per record.
 * Status is observable for the UI: idle | syncing | offline | signedout | error.
 */

const BATCH_RECORDS = 40
const BATCH_BYTES = 3_000_000

let status = { state: 'idle', lastSync: null, pending: 0 }
const listeners = new Set()
export const getStatus = () => status
export function subscribe(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}
function setStatus(changes) {
  status = { ...status, ...changes }
  listeners.forEach((fn) => fn(status))
}

export class SignedOut extends Error {}

async function post(path, body) {
  let res
  try {
    res = await fetch(path, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })
  } catch {
    throw new TypeError('offline')
  }
  if (res.status === 401) throw new SignedOut()
  if (!res.ok) throw new Error(`server ${res.status}`)
  return res.json()
}

function toRecord(kind, row) {
  if (kind === 'setting') return { kind, uid: row.key, updatedAt: row.updatedAt, deleted: 0, data: { value: row.value } }
  // personId and id are local; the server only knows uids.
  const { id: _id, dirty: _dirty, personId: _pid, ...data } = row // eslint-disable-line no-unused-vars
  return { kind, uid: row.uid, updatedAt: row.updatedAt, deleted: row.deleted ? 1 : 0, data }
}

async function dirtyRecords() {
  const [people, gifts, settings] = await Promise.all([
    db.people.where('dirty').equals(1).toArray(),
    db.gifts.where('dirty').equals(1).toArray(),
    db.settings.where('key').anyOf(SYNCED_SETTINGS).filter((s) => s.dirty === 1).toArray(),
  ])
  // People before gifts so a new person exists on the server before its ideas.
  return [...settings.map((r) => toRecord('setting', r)), ...people.map((r) => toRecord('person', r)), ...gifts.map((r) => toRecord('gift', r))]
}

function batches(records) {
  const out = []
  let cur = []
  let bytes = 0
  for (const r of records) {
    const size = JSON.stringify(r).length
    if (cur.length && (cur.length >= BATCH_RECORDS || bytes + size > BATCH_BYTES)) {
      out.push(cur)
      cur = []
      bytes = 0
    }
    cur.push(r)
    bytes += size
  }
  if (cur.length) out.push(cur)
  return out
}

// After a successful push, clear dirty only if the row didn't change meanwhile.
async function markClean(sent) {
  await db.transaction('rw', db.people, db.gifts, db.settings, async () => {
    for (const r of sent) {
      if (r.kind === 'setting') {
        const row = await db.settings.get(r.uid)
        if (row && row.updatedAt === r.updatedAt) await db.settings.put({ ...row, dirty: 0 })
        continue
      }
      const table = r.kind === 'person' ? db.people : db.gifts
      const row = await table.where('uid').equals(r.uid).first()
      if (row && row.updatedAt === r.updatedAt) await table.update(row.id, { dirty: 0 })
    }
  })
}

// Apply what the server sent, unless our local copy is newer and not uploaded yet.
async function applyRemote(changes) {
  const order = { setting: 0, person: 1, gift: 2 }
  changes.sort((a, b) => order[a.kind] - order[b.kind])
  await db.transaction('rw', db.people, db.gifts, db.settings, async () => {
    for (const c of changes) {
      if (c.kind === 'setting') {
        const row = await db.settings.get(c.uid)
        if (row?.dirty && row.updatedAt > c.updatedAt) continue
        await db.settings.put({ key: c.uid, value: c.data.value, updatedAt: c.updatedAt, dirty: 0 })
        continue
      }
      const table = c.kind === 'person' ? db.people : db.gifts
      const row = await table.where('uid').equals(c.uid).first()
      if (row && row.dirty && row.updatedAt > c.updatedAt) continue
      if (row && !row.dirty && row.updatedAt === c.updatedAt) continue
      const next = { ...c.data, uid: c.uid, updatedAt: c.updatedAt, deleted: c.deleted ? 1 : 0, dirty: 0 }
      if (c.kind === 'gift') {
        const person = c.data.personUid ? await db.people.where('uid').equals(c.data.personUid).first() : null
        next.personId = person?.id ?? -1
      }
      if (row) await table.put({ ...next, id: row.id })
      else await table.add(next)
    }
    // An idea can arrive before its person (another page); link any that are waiting.
    const waiting = await db.gifts.where('personId').equals(-1).toArray()
    for (const g of waiting) {
      const person = g.personUid ? await db.people.where('uid').equals(g.personUid).first() : null
      if (person) await db.gifts.update(g.id, { personId: person.id })
    }
  })
}

let running = null
let again = false

async function syncOnce() {
  const meta = await getSetting('sync', { lastSeq: 0 })
  let since = meta.lastSeq || 0
  // Push, a batch at a time; each answer also carries the first page of remote changes.
  const pending = await dirtyRecords()
  setStatus({ pending: pending.length })
  const groups = batches(pending)
  let more = true
  if (!groups.length) groups.push([])
  for (const group of groups) {
    const res = await post('/api/sync', { since, changes: group })
    await markClean(group)
    await applyRemote(res.changes)
    since = res.seq
    more = res.more
    await db.settings.put({ key: 'sync', value: { ...meta, lastSeq: since } })
  }
  // Keep pulling while the server has more.
  while (more) {
    const res = await post('/api/sync', { since, changes: [] })
    await applyRemote(res.changes)
    since = res.seq
    more = res.more
    await db.settings.put({ key: 'sync', value: { ...meta, lastSeq: since } })
  }
}

/** Runs a sync now (coalesces overlapping calls). Resolves to true when everything is uploaded. */
export function syncNow() {
  if (running) {
    again = true
    return running
  }
  running = (async () => {
    setStatus({ state: 'syncing' })
    try {
      do {
        again = false
        await syncOnce()
      } while (again)
      const left = (await dirtyRecords()).length
      setStatus({ state: 'idle', lastSync: Date.now(), pending: left })
      return left === 0
    } catch (err) {
      const pending = (await dirtyRecords()).length
      if (err instanceof SignedOut) setStatus({ state: 'signedout', pending })
      else if (err instanceof TypeError) setStatus({ state: 'offline', pending })
      else {
        console.error('[sync]', err)
        setStatus({ state: 'error', pending })
      }
      return false
    } finally {
      running = null
    }
  })()
  return running
}

let started = false
let timer = null
/** Starts automatic sync: after local changes (1 s), when the app comes back, when online, every minute. */
export function startSync() {
  if (started) return
  started = true
  const soon = () => {
    clearTimeout(timer)
    timer = setTimeout(syncNow, 1000)
  }
  onLocalWrite(soon)
  document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && syncNow())
  window.addEventListener('online', syncNow)
  setInterval(() => document.visibilityState === 'visible' && syncNow(), 60_000)
  syncNow()
}
