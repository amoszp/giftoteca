import { test } from 'node:test'
import assert from 'node:assert/strict'
import { invalidChange, openStore, PAGE_SIZE } from '../store.js'

const rec = (uid, updatedAt, data = {}, kind = 'person', deleted = 0) => ({ kind, uid, updatedAt, data, deleted })

test('a change from one device reaches another', () => {
  const s = openStore(':memory:')
  const a = s.sync(1, 0, [rec('p1', 100, { name: 'Ana' })])
  assert.equal(a.applied, 1)
  const b = s.sync(1, 0, [])
  assert.deepEqual(b.changes.map((c) => c.data.name), ['Ana'])
  assert.equal(b.more, false)
  // Nothing new after the last seq.
  assert.equal(s.sync(1, b.seq, []).changes.length, 0)
})

test('the newest updatedAt wins, older edits are ignored', () => {
  const s = openStore(':memory:')
  s.sync(1, 0, [rec('p1', 200, { name: 'Nuevo' })])
  const r = s.sync(1, 0, [rec('p1', 100, { name: 'Viejo' })])
  assert.equal(r.applied, 0)
  assert.equal(r.changes[0].data.name, 'Nuevo')
  s.sync(1, 0, [rec('p1', 300, { name: 'Más nuevo' })])
  assert.equal(s.sync(1, 0, []).changes[0].data.name, 'Más nuevo')
})

test('deletes travel as tombstones', () => {
  const s = openStore(':memory:')
  s.sync(1, 0, [rec('g1', 100, { title: 'Bufanda' }, 'gift')])
  const seq = s.sync(1, 0, []).seq
  s.sync(1, seq, [rec('g1', 200, { title: 'Bufanda' }, 'gift', 1)])
  const r = s.sync(1, seq, [])
  assert.equal(r.changes.length, 1)
  assert.equal(r.changes[0].deleted, 1)
})

test('each account only sees its own records', () => {
  const s = openStore(':memory:')
  s.sync(1, 0, [rec('p1', 100, { name: 'De Moe' })])
  s.sync(2, 0, [rec('p1', 100, { name: 'De otra cuenta' })])
  assert.deepEqual(s.sync(1, 0, []).changes.map((c) => c.data.name), ['De Moe'])
  assert.deepEqual(s.sync(2, 0, []).changes.map((c) => c.data.name), ['De otra cuenta'])
})

test('large pulls come in pages', () => {
  const s = openStore(':memory:')
  const all = Array.from({ length: PAGE_SIZE + 30 }, (_, i) => rec('p' + i, 100 + i))
  for (let i = 0; i < all.length; i += 100) s.sync(1, 0, all.slice(i, i + 100))
  const first = s.sync(1, 0, [])
  assert.equal(first.changes.length, PAGE_SIZE)
  assert.equal(first.more, true)
  const second = s.sync(1, first.seq, [])
  assert.equal(second.changes.length, 30)
  assert.equal(second.more, false)
})

test('bad changes are refused', () => {
  assert.ok(invalidChange({ kind: 'nope', uid: 'a', updatedAt: 1, data: {} }))
  assert.ok(invalidChange({ kind: 'gift', uid: '', updatedAt: 1, data: {} }))
  assert.ok(invalidChange({ kind: 'gift', uid: 'a', updatedAt: 'x', data: {} }))
  assert.ok(invalidChange({ kind: 'gift', uid: 'a', updatedAt: 1, data: [] }))
  assert.equal(invalidChange({ kind: 'gift', uid: 'a', updatedAt: 1, data: {} }), null)
})
