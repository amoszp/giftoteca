import { useEffect, useRef, useState } from 'react'
import { Plus, Trash2, X } from 'lucide-react'
import { addPerson, aboutOf, deleteCustomOccasion, saveCustomOccasion, updatePerson } from '../db'
import { Sheet } from './ui'
import { useToast } from './Toast'

/* Name and birthday. */
export function PersonForm({ person, onClose, onAdded }) {
  const toast = useToast()
  const [name, setName] = useState(person?.name || '')
  const [birthday, setBirthday] = useState(person?.birthday || '')

  async function save(e) {
    e.preventDefault()
    const n = name.trim()
    if (!n) return
    if (person) {
      await updatePerson(person.id, { name: n, birthday: birthday || null })
      toast('Cambios guardados')
    } else {
      const id = await addPerson(n, birthday || null)
      toast(`${n} añadida a Personas`)
      onAdded?.(id)
    }
    onClose()
  }

  return (
    <Sheet title={person ? 'Nombre y cumpleaños' : 'Nueva persona'} onClose={onClose}>
      <form onSubmit={save} style={{ display: 'contents' }}>
        <div className="field">
          <label htmlFor="p-name">Nombre</label>
          <input id="p-name" className="input" value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" />
        </div>
        <div className="field">
          <label htmlFor="p-bday">Cumpleaños (opcional)</label>
          <input id="p-bday" className="input" type="date" value={birthday} onChange={(e) => setBirthday(e.target.value)} />
        </div>
        <button type="submit" className="btn btn-primary btn-block" disabled={!name.trim()}>
          {person ? 'Guardar cambios' : 'Añadir persona'}
        </button>
      </form>
    </Sheet>
  )
}

function TagField({ id, label, placeholder, values, onChange, warn }) {
  const [text, setText] = useState('')
  const inputRef = useRef(null)
  function add() {
    const v = text.trim()
    if (!v) return inputRef.current?.focus()
    onChange([...values, v])
    setText('')
    inputRef.current?.focus()
  }
  return (
    <div className="field">
      <span className="lab" id={`lab-${id}`}>{label}</span>
      {values.length > 0 && (
        <div className="tagbox">
          {values.map((t, i) => (
            <span key={i} className={'tag' + (warn ? ' warn' : '')}>
              {t}
              <button type="button" aria-label={`Quitar ${t}`} onClick={() => onChange(values.filter((_, j) => j !== i))}>
                <X />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="tag-add">
        <input
          id={id}
          ref={inputRef}
          className="input"
          value={text}
          placeholder={placeholder}
          aria-labelledby={`lab-${id}`}
          autoComplete="off"
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              add()
            }
          }}
        />
        <button type="button" className="btn btn-sec" onClick={add}>Añadir</button>
      </div>
    </div>
  )
}

/* Sizes, likes, avoid, already has, notes. `focus` scrolls to one field. */
export function AboutForm({ person, focus, onClose }) {
  const toast = useToast()
  const [d, setD] = useState(() => structuredClone(aboutOf(person)))
  const set = (changes) => setD((x) => ({ ...x, ...changes }))
  const setSize = (i, changes) => set({ sizes: d.sizes.map((s, j) => (j === i ? { ...s, ...changes } : s)) })

  useEffect(() => {
    if (!focus) return
    const t = setTimeout(() => {
      const el = document.getElementById(focus)
      el?.scrollIntoView({ block: 'center' })
      el?.focus({ preventScroll: true })
    }, 280)
    return () => clearTimeout(t)
  }, [focus])

  async function save(e) {
    e.preventDefault()
    // Text typed in a tag field but not yet added still counts.
    const pending = (id) => document.getElementById(id)?.value.trim()
    const about = {
      ...d,
      sizes: d.sizes.filter((s) => !s.custom || (s.k.trim() && s.v.trim())),
      likes: pending('t-likes') ? [...d.likes, pending('t-likes')] : d.likes,
      avoid: pending('t-avoid') ? [...d.avoid, pending('t-avoid')] : d.avoid,
      has: pending('t-has') ? [...d.has, pending('t-has')] : d.has,
    }
    await updatePerson(person.id, { about })
    toast('Cambios guardados')
    onClose()
  }

  return (
    <Sheet title={`Detalles de ${person.name}`} onClose={onClose}>
      <form onSubmit={save} style={{ display: 'contents' }}>
        <div className="field">
          <span className="lab">Tallas</span>
          {d.sizes.map((s, i) =>
            s.custom ? (
              <div className="size-row custom" key={i}>
                <input className="input" value={s.k} placeholder="Qué talla" aria-label="Nombre de la talla" onChange={(e) => setSize(i, { k: e.target.value })} />
                <input className="input" value={s.v} aria-label="Talla" onChange={(e) => setSize(i, { v: e.target.value })} />
                <button type="button" className="size-del" aria-label="Quitar talla" onClick={() => set({ sizes: d.sizes.filter((_, j) => j !== i) })}>
                  <X />
                </button>
              </div>
            ) : (
              <div className="size-row" key={i}>
                <label className="lab-fixed" htmlFor={`sz-${i}`}>{s.k}</label>
                <input id={`sz-${i}`} className="input" value={s.v} onChange={(e) => setSize(i, { v: e.target.value })} />
              </div>
            )
          )}
          <button type="button" className="btn btn-sec" style={{ alignSelf: 'flex-start' }} onClick={() => set({ sizes: [...d.sizes, { k: '', v: '', custom: true }] })}>
            <Plus />
            Añadir talla
          </button>
        </div>
        <TagField id="t-likes" label="Le gusta" placeholder="Café, jardinería…" values={d.likes} onChange={(likes) => set({ likes })} />
        <TagField id="t-avoid" label="Evitar" placeholder="Alergias, lo que no le gusta" values={d.avoid} onChange={(avoid) => set({ avoid })} warn />
        <TagField id="t-has" label="Ya tiene" placeholder="Para no repetir" values={d.has} onChange={(has) => set({ has })} />
        <div className="field">
          <label htmlFor="a-notes">Notas</label>
          <textarea id="a-notes" className="input" value={d.notes} onChange={(e) => set({ notes: e.target.value })} />
        </div>
        <button type="submit" className="btn btn-primary btn-block">Guardar cambios</button>
      </form>
    </Sheet>
  )
}

/* A custom occasion: name and yearly date. */
export function OccasionForm({ occasion, onClose }) {
  const toast = useToast()
  const [label, setLabel] = useState(occasion?.label || '')
  const [date, setDate] = useState(occasion?.md ? `2026-${occasion.md}` : '')

  async function save(e) {
    e.preventDefault()
    if (!label.trim() || !date) return
    await saveCustomOccasion({ k: occasion?.k, label: label.trim(), md: date.slice(5) })
    toast(occasion ? 'Cambios guardados' : `${label.trim()} añadida`)
    onClose()
  }
  async function remove() {
    const undo = await deleteCustomOccasion(occasion.k)
    onClose()
    toast('Ocasión eliminada', undo)
  }

  return (
    <Sheet title={occasion ? 'Editar ocasión' : 'Nueva ocasión'} onClose={onClose}>
      <form onSubmit={save} style={{ display: 'contents' }}>
        <div className="field">
          <label htmlFor="o-name">Nombre</label>
          <input id="o-name" className="input" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Aniversario, Amigo invisible…" autoComplete="off" />
        </div>
        <div className="field">
          <label htmlFor="o-date">Fecha (se repite cada año)</label>
          <input id="o-date" className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <button type="submit" className="btn btn-primary btn-block" disabled={!label.trim() || !date}>
          {occasion ? 'Guardar cambios' : 'Añadir ocasión'}
        </button>
      </form>
      {occasion && (
        <div className="danger-zone">
          <button type="button" className="btn btn-danger btn-block" onClick={remove}>
            <Trash2 />
            Eliminar ocasión
          </button>
        </div>
      )}
    </Sheet>
  )
}
