import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Link, useParams } from 'react-router-dom'
import { ChevronLeft, ExternalLink, Trash2, Plus } from 'lucide-react'
import { db, addGift, updateGift, deleteGift, OCCASION_LABELS } from '../db'
import GlassCheckbox from '../components/GlassCheckbox'

export default function PersonDetail() {
  const { personId, occasion } = useParams()
  const id = Number(personId)
  const [title, setTitle] = useState('')
  const [link, setLink] = useState('')

  const person = useLiveQuery(() => db.people.get(id), [id])
  const gifts = useLiveQuery(
    () => db.gifts.where({ personId: id, occasion }).toArray(),
    [id, occasion]
  ) || []

  const pending = gifts.filter((g) => !g.bought)
  const bought = gifts.filter((g) => g.bought)

  async function handleAdd(e) {
    e.preventDefault()
    if (!title.trim()) return
    await addGift(id, occasion, title.trim(), link.trim())
    setTitle('')
    setLink('')
  }

  if (!person) return null

  return (
    <div className="page">
      <header className="page-header">
        <Link to={-1} className="back-link"><ChevronLeft size={20} strokeWidth={2.5} /> {person.name}</Link>
        <span className="occasion-tag">{OCCASION_LABELS[occasion]}</span>
      </header>

      <form className="add-gift-form" onSubmit={handleAdd}>
        <input
          type="text"
          placeholder="Idea de regalo"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <input
          type="url"
          placeholder="Link (opcional)"
          value={link}
          onChange={(e) => setLink(e.target.value)}
        />
        <button type="submit"><Plus size={16} strokeWidth={2.5} /> Añadir</button>
      </form>

      <GiftGroup title="Por comprar" gifts={pending} />
      <GiftGroup title="Ya comprados" gifts={bought} />
    </div>
  )
}

function GiftGroup({ title, gifts }) {
  if (gifts.length === 0) return null
  return (
    <section className="gift-group">
      <h2>{title}</h2>
      <ul className="gift-list">
        {gifts.map((gift) => (
          <GiftItem key={gift.id} gift={gift} />
        ))}
      </ul>
    </section>
  )
}

function GiftItem({ gift }) {
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(gift.title)
  const [link, setLink] = useState(gift.link || '')

  async function handleSave(e) {
    e.preventDefault()
    await updateGift(gift.id, { title: title.trim() || gift.title, link: link.trim() })
    setEditing(false)
  }

  if (editing) {
    return (
      <li className="gift-item editing">
        <form onSubmit={handleSave} className="edit-gift-form">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Idea de regalo" />
          <input value={link} onChange={(e) => setLink(e.target.value)} placeholder="Link (opcional)" />
          <button type="submit">Guardar</button>
          <button type="button" onClick={() => setEditing(false)}>Cancelar</button>
        </form>
      </li>
    )
  }

  return (
    <li className={'gift-item' + (gift.bought ? ' bought' : '')}>
      <GlassCheckbox
        checked={gift.bought}
        onChange={(e) => updateGift(gift.id, { bought: e.target.checked })}
      />
      <div className="gift-info" onClick={() => setEditing(true)}>
        <span className="gift-title">{gift.title}</span>
        {gift.bought && <span className="bought-badge">Comprado</span>}
        {gift.link && (
          <a
            href={gift.link}
            target="_blank"
            rel="noreferrer"
            className="gift-link"
            onClick={(e) => e.stopPropagation()}
          >
            <ExternalLink size={12} /> Ver enlace
          </a>
        )}
      </div>
      <button className="gift-delete" onClick={() => deleteGift(gift.id)} aria-label="Borrar">
        <Trash2 size={16} />
      </button>
    </li>
  )
}
