import { DatabaseSync } from 'node:sqlite'
import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'

/*
 * One row per synced record (person, gift or setting) per user.
 * seq is a global, ever-growing change number: clients ask for "everything after seq N".
 * Conflicts: the change with the newest updatedAt wins.
 */

export const KINDS = new Set(['person', 'gift', 'setting'])
export const PAGE_SIZE = 200

export function openStore(path) {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true })
  const db = new DatabaseSync(path)
  db.exec('PRAGMA journal_mode = WAL')
  db.exec(`
    CREATE TABLE IF NOT EXISTS records (
      user_id    INTEGER NOT NULL,
      kind       TEXT    NOT NULL,
      uid        TEXT    NOT NULL,
      data       TEXT    NOT NULL,
      updated_at INTEGER NOT NULL,
      deleted    INTEGER NOT NULL DEFAULT 0,
      seq        INTEGER NOT NULL,
      PRIMARY KEY (user_id, kind, uid)
    );
    CREATE INDEX IF NOT EXISTS records_user_seq ON records (user_id, seq);
  `)

  const maxSeq = db.prepare('SELECT COALESCE(MAX(seq), 0) AS s FROM records')
  const userMax = db.prepare('SELECT COALESCE(MAX(seq), 0) AS s FROM records WHERE user_id = ?')
  const get = db.prepare('SELECT updated_at FROM records WHERE user_id = ? AND kind = ? AND uid = ?')
  const upsert = db.prepare(`
    INSERT INTO records (user_id, kind, uid, data, updated_at, deleted, seq)
    VALUES (@user, @kind, @uid, @data, @updatedAt, @deleted, @seq)
    ON CONFLICT (user_id, kind, uid) DO UPDATE SET
      data = excluded.data, updated_at = excluded.updated_at, deleted = excluded.deleted, seq = excluded.seq
  `)
  const page = db.prepare('SELECT kind, uid, data, updated_at, deleted, seq FROM records WHERE user_id = ? AND seq > ? ORDER BY seq LIMIT ?')

  function apply(user, changes) {
    if (!changes.length) return 0
    db.exec('BEGIN IMMEDIATE')
    try {
      let seq = maxSeq.get().s
      let applied = 0
      for (const c of changes) {
        const existing = get.get(user, c.kind, c.uid)
        if (existing && existing.updated_at > c.updatedAt) continue
        upsert.run({ user, kind: c.kind, uid: c.uid, data: JSON.stringify(c.data), updatedAt: c.updatedAt, deleted: c.deleted ? 1 : 0, seq: ++seq })
        applied++
      }
      db.exec('COMMIT')
      return applied
    } catch (err) {
      db.exec('ROLLBACK')
      throw err
    }
  }

  return {
    /** Applies the client's changes, then returns one page of everything after `since`. */
    sync(user, since, changes) {
      const applied = apply(user, changes)
      const rows = page.all(user, since, PAGE_SIZE + 1)
      const more = rows.length > PAGE_SIZE
      const list = rows.slice(0, PAGE_SIZE)
      const seq = list.length ? list[list.length - 1].seq : Math.max(since, more ? since : userMax.get(user).s)
      return {
        applied,
        more,
        seq,
        changes: list.map((r) => ({ kind: r.kind, uid: r.uid, data: JSON.parse(r.data), updatedAt: r.updated_at, deleted: r.deleted })),
      }
    },
    close: () => db.close(),
  }
}

/** Validates a client change; returns an error message or null. */
export function invalidChange(c) {
  if (!c || typeof c !== 'object') return 'change must be an object'
  if (!KINDS.has(c.kind)) return 'unknown kind'
  if (typeof c.uid !== 'string' || !c.uid || c.uid.length > 64) return 'bad uid'
  if (!Number.isFinite(c.updatedAt) || c.updatedAt <= 0) return 'bad updatedAt'
  if (!c.data || typeof c.data !== 'object' || Array.isArray(c.data)) return 'bad data'
  return null
}
