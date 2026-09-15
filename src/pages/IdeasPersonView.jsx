import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Link, useParams } from 'react-router-dom'
import { ChevronLeft, ExternalLink, Trash2, Plus } from 'lucide-react'
import { db, addGift, updateGift, deleteGift, OCCASIONS, OCCASION_LABELS } from '../db'
import GlassCheckbox from '../components/GlassCheckbox'

const GROUPS = [
  { occasion: OCCASIONS.CUMPLEANOS, heading: 'Para su cumpleaños' },
  { occasion: OCCASIONS.NAVIDAD, heading: 'Para Navidad' },
  { occasion: OCCASIONS.IDEA, heading: 'Ideas generales' },
]

export default function IdeasPersonView() {
  const { personId } = useParams()
  const id = Number(personId)
  const [title, setTitle] = useState('')
  const [link, setLink] = useState('')
  const [category, setCategory] = useState(OCCASIONS.IDEA)

  const person = useLiveQuery(() => db.people.get(id), [id])
  const gifts = useLiveQuery(() => db.gifts.where('personId').equals(id).toArray(), [id]) || []

  async function handleAdd(e) {
    e.preventDefault()
    if (!title.trim()) return
    await addGift(id, category, title.trim(), link.trim())
    setTitle('')
    setLink('')
  }

  if (!person) return null

  return (
    <div className="page">
      <header className="page-header">
        <Link to="/ideas" className="back-link"><ChevronLeft size={20} strokeWidth={2.5} /> {person.name}</Link>
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
        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          {GROUPS.map((g) => (
            <option key={g.occasion} value={g.occasion}>
              {OCCASION_LABELS[g.occasion]}
            </option>
          ))}
        </select>
        <button type="submit"><Plus size={16} strokeWidth={2.5} /> Añadir</button>
      </form>

      {GROUPS.map((g) => {
        const items = gifts.filter((gift) => gift.occasion === g.occasion)
        if (items.length === 0) return null
        return (
          <section key={g.occasion} className="gift-group">
            <h2 className="gift-group-heading">{g.heading}</h2>
            <ul className="gift-list">
              {items.map((gift) => (
                <GiftRow key={gift.id} gift={gift} />
              ))}
            </ul>
          </section>
        )
      })}

      {gifts.length === 0 && (
        <p className="empty-state">Todavía no tienes ideas para {person.name}.</p>
      )}
    </div>
  )
}

function GiftRow({ gift }) {
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
