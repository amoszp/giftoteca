import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Settings as SettingsIcon, UserPlus, Pencil, Trash2 } from 'lucide-react'
import { db, addPerson, updatePerson, deletePerson } from '../db'

export default function Settings() {
  const people = useLiveQuery(() => db.people.orderBy('name').toArray(), []) || []
  const [name, setName] = useState('')
  const [birthday, setBirthday] = useState('')
  const [editingId, setEditingId] = useState(null)

  async function handleAdd(e) {
    e.preventDefault()
    if (!name.trim()) return
    await addPerson(name.trim(), birthday || null)
    setName('')
    setBirthday('')
  }

  return (
    <div className="page">
      <header className="page-header">
        <h1 className="occasion-title">
          <span className="occasion-icon"><SettingsIcon size={22} strokeWidth={2} /></span> Ajustes
        </h1>
      </header>

      <form className="add-person-form" onSubmit={handleAdd}>
        <input
          type="text"
          placeholder="Nombre"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <span className="date-field-wrap">
          <input
            type="date"
            value={birthday}
            onChange={(e) => setBirthday(e.target.value)}
          />
          {!birthday && <span className="date-field-placeholder">Cumpleaños</span>}
        </span>
        <button type="submit"><UserPlus size={16} strokeWidth={2.5} /> Añadir persona</button>
      </form>

      <ul className="settings-person-list">
        {people.map((person) => (
          <PersonRow
            key={person.id}
            person={person}
            editing={editingId === person.id}
            onEdit={() => setEditingId(person.id)}
            onDone={() => setEditingId(null)}
          />
        ))}
      </ul>
    </div>
  )
}

function PersonRow({ person, editing, onEdit, onDone }) {
  const [name, setName] = useState(person.name)
  const [birthday, setBirthday] = useState(person.birthday || '')

  async function handleSave(e) {
    e.preventDefault()
    await updatePerson(person.id, { name: name.trim() || person.name, birthday: birthday || null })
    onDone()
  }

  async function handleDelete() {
    if (confirm(`¿Borrar a ${person.name} y todas sus ideas de regalo?`)) {
      await deletePerson(person.id)
    }
  }

  if (editing) {
    return (
      <li className="settings-person-row editing">
        <form onSubmit={handleSave} className="edit-person-form">
          <input value={name} onChange={(e) => setName(e.target.value)} />
          <input type="date" value={birthday} onChange={(e) => setBirthday(e.target.value)} />
          <button type="submit">Guardar</button>
          <button type="button" onClick={onDone}>Cancelar</button>
        </form>
      </li>
    )
  }

  return (
    <li className="settings-person-row">
      <span className="person-avatar">
        {person.name.charAt(0).toUpperCase()}
      </span>
      <div className="settings-person-info">
        <span className="settings-person-name">{person.name}</span>
        {person.birthday && (
          <span className="settings-person-birthday">
            {new Date(person.birthday + 'T00:00:00').toLocaleDateString('es-ES', {
              day: 'numeric',
              month: 'long',
            })}
          </span>
        )}
      </div>
      <div className="settings-person-actions">
        <button onClick={onEdit} aria-label="Editar"><Pencil size={16} /></button>
        <button onClick={handleDelete} aria-label="Borrar"><Trash2 size={16} /></button>
      </div>
    </li>
  )
}
