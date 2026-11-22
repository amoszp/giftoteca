import { useRef, useState } from 'react'
import { Camera, ExternalLink, Image, ImageOff, Pencil, Trash2, User } from 'lucide-react'
import { addGift, aboutOf, deleteGift, setBought, updateGift } from '../db'
import { domain } from '../lib/useData'
import { readPhoto } from '../lib/photo'
import { OccChip, Sheet, Switch, ocStyle } from './ui'
import { useToast } from './Toast'

/* The idea's card: photo, link, bought, move to another occasion, edit, delete. */
export function IdeaSheet({ gift, person, data, onClose, onEdit, onOpenPerson }) {
  const toast = useToast()
  const o = data.occ(gift.occasion)
  const others = data.active.filter((x) => x.k !== gift.occasion)
  const about = aboutOf(person)
  const sizes = about.sizes.filter((s) => s.k.trim() && s.v.trim())

  async function move(k) {
    const from = gift.occasion
    await updateGift(gift.id, { occasion: k })
    onClose()
    toast(`Movida a ${data.occ(k).label}`, () => updateGift(gift.id, { occasion: from }))
  }
  async function remove() {
    const undo = await deleteGift(gift.id)
    onClose()
    toast('Idea eliminada', undo)
  }

  return (
    <Sheet
      onClose={onClose}
      context={
        <span className="sheet-ctx" style={ocStyle(o)}>
          <span className="odot" aria-hidden="true" />
          {person?.name} · {o?.label}
        </span>
      }
    >
      {gift.photo && <div className="photo-big" role="img" aria-label={`Foto de ${gift.title}`} style={{ backgroundImage: `url(${gift.photo})` }} />}
      <h3 className="idea-h">{gift.title}</h3>
      {(sizes.length > 0 || about.avoid.length > 0) && (
        <div className="about-mini">
          {sizes.length > 0 && (
            <>
              <span className="h">Tallas de {person.name}</span>
              <span className="sizes">
                {sizes.map((s, i) => (
                  <span key={i}>
                    {s.k}
                    <b>{s.v}</b>
                  </span>
                ))}
              </span>
            </>
          )}
          {about.avoid.length > 0 && (
            <>
              <span className="h">Evitar</span>
              <span className="tags">
                {about.avoid.map((t, i) => (
                  <span className="tag warn" key={i}>{t}</span>
                ))}
              </span>
            </>
          )}
        </div>
      )}
      {gift.link && (
        <a className="btn btn-sec btn-block" href={gift.link} target="_blank" rel="noreferrer">
          <ExternalLink />
          Abrir {domain(gift.link)}
        </a>
      )}
      <div className="switch-row">
        <span id="bought-label">Comprada</span>
        <Switch checked={gift.bought} labelledBy="bought-label" onChange={(v) => setBought(gift.id, v)} />
      </div>
      {others.length > 0 && (
        <div className="field">
          <span className="lab">Mover a</span>
          <div className="move">
            {others.map((x) => (
              <button key={x.k} type="button" className="btn btn-sec" onClick={() => move(x.k)}>
                {x.label}
              </button>
            ))}
          </div>
        </div>
      )}
      {onOpenPerson && (
        <button type="button" className="btn btn-sec btn-block" onClick={onOpenPerson}>
          <User />
          Ver las ideas de {person?.name}
        </button>
      )}
      <button type="button" className="btn btn-sec btn-block" onClick={onEdit}>
        <Pencil />
        Editar idea
      </button>
      <div className="danger-zone">
        <button type="button" className="btn btn-danger btn-block" onClick={remove}>
          <Trash2 />
          Eliminar idea
        </button>
      </div>
    </Sheet>
  )
}

/* Add or edit an idea. */
export function IdeaForm({ initial, person, data, onClose, onSaved }) {
  const toast = useToast()
  const [d, setD] = useState(initial)
  const [error, setError] = useState('')
  const camRef = useRef(null)
  const libRef = useRef(null)
  const set = (changes) => setD((x) => ({ ...x, ...changes }))

  async function pick(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      set({ photo: await readPhoto(file) })
      setError('')
    } catch (err) {
      setError(err.message)
    }
  }

  async function save(e) {
    e.preventDefault()
    const title = d.title.trim()
    if (!title) return
    if (d.id) {
      await updateGift(d.id, { title, link: d.link.trim(), photo: d.photo, occasion: d.occasion })
      toast(initial.occasion !== d.occasion ? `Guardada en ${data.occ(d.occasion).label}` : 'Cambios guardados')
    } else {
      await addGift({ personId: d.personId, occasion: d.occasion, title, link: d.link.trim(), photo: d.photo })
      toast('Idea añadida')
    }
    onSaved?.(d.occasion)
    onClose()
  }

  return (
    <Sheet title={d.id ? 'Editar idea' : `Nueva idea para ${person?.name}`} onClose={onClose}>
      <form onSubmit={save} style={{ display: 'contents' }}>
        {d.photo ? (
          <>
            <div className="photo-big" role="img" aria-label="Foto elegida" style={{ backgroundImage: `url(${d.photo})` }} />
            <div className="photo-actions">
              <button type="button" className="btn btn-sec" onClick={() => libRef.current.click()}>
                <Image />
                Cambiar foto
              </button>
              <button type="button" className="btn btn-danger" onClick={() => set({ photo: null })}>
                <ImageOff />
                Quitar foto
              </button>
            </div>
          </>
        ) : (
          <div className="photo-empty">
            <button type="button" className="btn btn-sec" onClick={() => camRef.current.click()}>
              <Camera />
              Hacer foto
            </button>
            <button type="button" className="btn btn-sec" onClick={() => libRef.current.click()}>
              <Image />
              Elegir foto
            </button>
          </div>
        )}
        {error && <p className="note" role="alert" style={{ color: 'var(--danger)', margin: 0 }}>{error}</p>}
        <input ref={camRef} className="hidden-file" type="file" accept="image/*" capture="environment" tabIndex={-1} aria-hidden="true" onChange={pick} />
        <input ref={libRef} className="hidden-file" type="file" accept="image/*" tabIndex={-1} aria-hidden="true" onChange={pick} />
        <div className="field">
          <label htmlFor="f-title">Idea</label>
          <input id="f-title" className="input" value={d.title} onChange={(e) => set({ title: e.target.value })} placeholder="Qué le regalarías" autoComplete="off" />
        </div>
        <div className="field">
          <label htmlFor="f-link">Enlace (opcional)</label>
          <input id="f-link" className="input" type="url" inputMode="url" value={d.link} onChange={(e) => set({ link: e.target.value })} placeholder="https://" autoComplete="off" />
        </div>
        <div className="field">
          <span className="lab" id="f-occ">Ocasión</span>
          <div className="chips wrap" role="group" aria-labelledby="f-occ">
            {data.active.map((o) => (
              <OccChip key={o.k} o={o} pressed={d.occasion === o.k} onClick={() => set({ occasion: o.k })} />
            ))}
          </div>
        </div>
        <button type="submit" className="btn btn-primary btn-block" disabled={!d.title.trim()}>
          {d.id ? 'Guardar cambios' : 'Añadir idea'}
        </button>
      </form>
    </Sheet>
  )
}
