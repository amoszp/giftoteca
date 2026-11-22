import { useState } from 'react'
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ChevronLeft, Link2, Pencil, Plus, Trash2 } from 'lucide-react'
import { aboutOf, daysText, deletePerson, longDate, nextOccurrence, setBought } from '../db'
import { domain } from '../lib/useData'
import { Chev, OccChip, Seg, Thumb, Tick } from '../components/ui'
import { IdeaForm, IdeaSheet } from '../components/IdeaSheets'
import { AboutForm, PersonForm } from '../components/PersonSheets'
import { useToast } from '../components/Toast'

export default function Person({ data }) {
  const { id } = useParams()
  const personId = Number(id)
  const navigate = useNavigate()
  const location = useLocation()
  const toast = useToast()
  const [params, setParams] = useSearchParams()
  const [sheet, setSheet] = useState(null) // { type: 'idea'|'form'|'about'|'person', ... }

  const person = data.people.find((p) => p.id === personId)
  if (!data.ready) return null
  if (!person) return <p className="empty">Esta persona ya no está en Giftoteca.</p>

  const tab = params.get('tab') === 'detalles' ? 'detalles' : 'ideas'
  const occParam = params.get('occ')
  const occK = data.active.some((o) => o.k === occParam) ? occParam : 'cumpleanos'
  const ideaParam = Number(params.get('idea')) || null
  const from = location.state?.from || 'Personas'

  const update = (changes) => {
    const next = new URLSearchParams(params)
    Object.entries(changes).forEach(([k, v]) => (v == null ? next.delete(k) : next.set(k, v)))
    setParams(next, { replace: true, state: location.state })
  }
  const goBack = () => (location.key !== 'default' ? navigate(-1) : navigate('/personas'))

  const mine = data.gifts.filter((g) => g.personId === personId)
  const list = mine.filter((g) => g.occasion === occK).sort((a, b) => a.bought - b.bought || a.createdAt - b.createdAt)
  const bday = person.birthday ? nextOccurrence(data.occ('cumpleanos'), person) : null

  // An idea opened from search arrives as ?idea=ID.
  const openIdea = sheet?.type === 'idea' ? sheet.id : ideaParam
  const openGift = openIdea ? mine.find((g) => g.id === openIdea) : null
  const closeIdea = () => {
    setSheet(null)
    if (ideaParam) update({ idea: null })
  }

  async function removePerson() {
    const name = person.name
    const undo = await deletePerson(personId)
    navigate('/personas', { replace: true })
    toast(`${name} eliminada`, undo)
  }

  return (
    <>
      <button type="button" className="back" onClick={goBack}>
        <ChevronLeft />
        {from}
      </button>
      <div className="person-h">
        <h1>{person.name}</h1>
        {bday && (
          <p>
            Cumpleaños el {longDate(bday.date)}, <strong>{daysText(bday.days)}</strong>
          </p>
        )}
      </div>
      <Seg label="Sección" options={[['ideas', 'Ideas'], ['detalles', 'Detalles']]} value={tab} onChange={(t) => update({ tab: t === 'ideas' ? null : t })} />

      {tab === 'ideas' ? (
        <>
          <div className="chips" role="group" aria-label="Ocasión">
            {data.active.map((o) => (
              <OccChip key={o.k} o={o} pressed={occK === o.k} count={mine.filter((g) => g.occasion === o.k).length} onClick={() => update({ occ: o.k })} />
            ))}
          </div>
          {list.length ? (
            <ul className="list">
              {list.map((g) => (
                <li className="idea" key={g.id}>
                  <button type="button" className="idea-open" onClick={() => setSheet({ type: 'idea', id: g.id })}>
                    <Thumb photo={g.photo} />
                    <span style={{ minWidth: 0 }}>
                      <span className="idea-title">{g.title}</span>
                      <span className="idea-meta">
                        {g.bought && <span className="tag-ok">Comprada</span>}
                        {g.link && (
                          <span className="inline">
                            <Link2 aria-hidden="true" />
                            {domain(g.link)}
                          </span>
                        )}
                      </span>
                    </span>
                  </button>
                  <Tick checked={g.bought} onChange={(v) => setBought(g.id, v)} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="empty">Todavía no hay ideas en {data.occ(occK).label}.</p>
          )}
          <button
            type="button"
            className="btn btn-primary btn-block sticky-cta"
            onClick={() => setSheet({ type: 'form', initial: { id: null, personId, occasion: occK, title: '', link: '', photo: null } })}
          >
            <Plus />
            Añadir idea
          </button>
        </>
      ) : (
        <Details person={person} past={data.past.filter((g) => g.personId === personId)} occ={data.occ} onEdit={(focus) => setSheet({ type: 'about', focus })} onEditPerson={() => setSheet({ type: 'person' })} onDelete={removePerson} />
      )}

      {openGift && (
        <IdeaSheet
          gift={openGift}
          person={person}
          data={data}
          onClose={closeIdea}
          onEdit={() => setSheet({ type: 'form', initial: { ...openGift } })}
        />
      )}
      {sheet?.type === 'form' && (
        <IdeaForm initial={sheet.initial} person={person} data={data} onClose={() => setSheet(null)} onSaved={(k) => k !== occK && update({ occ: k })} />
      )}
      {sheet?.type === 'about' && <AboutForm person={person} focus={sheet.focus} onClose={() => setSheet(null)} />}
      {sheet?.type === 'person' && <PersonForm person={person} onClose={() => setSheet(null)} />}
    </>
  )
}

function Details({ person, past, occ, onEdit, onEditPerson, onDelete }) {
  const a = aboutOf(person)
  const sizes = a.sizes.filter((s) => s.k.trim() && s.v.trim())
  const card = (focus, label, filled, body, addText) => (
    <>
      <p className="label">{label}</p>
      <button type="button" className="d-card" onClick={() => onEdit(focus)} aria-label={filled ? `Editar ${label.toLowerCase()}` : undefined}>
        {filled ? (
          body
        ) : (
          <span className="d-add">
            <Plus />
            {addText}
          </span>
        )}
        <Pencil className="edit-hint" aria-hidden="true" />
      </button>
    </>
  )
  const tags = (list, warn) => (
    <span className="tags">
      {list.map((t, i) => (
        <span key={i} className={'tag' + (warn ? ' warn' : '')}>{t}</span>
      ))}
    </span>
  )
  const sortedPast = past.slice().sort((x, y) => y.givenYear - x.givenYear || y.id - x.id)

  return (
    <>
      <ul className="list">
        <li>
          <button type="button" className="row" onClick={onEditPerson}>
            <span className="grow">
              <span className="name sm">Nombre y cumpleaños</span>
            </span>
            <Chev />
          </button>
        </li>
      </ul>
      {card(
        'sz-0',
        'Tallas',
        sizes.length > 0,
        <span className="d-sizes">
          {sizes.map((s, i) => (
            <span className="d-size" key={i}>
              <span>{s.k}</span>
              <b>{s.v}</b>
            </span>
          ))}
        </span>,
        'Añadir tallas'
      )}
      {card('t-likes', 'Le gusta', a.likes.length > 0, tags(a.likes), 'Añadir gustos y aficiones')}
      {card('t-avoid', 'Evitar', a.avoid.length > 0, tags(a.avoid, true), 'Añadir alergias o lo que no le gusta')}
      {card('t-has', 'Ya tiene', a.has.length > 0, tags(a.has), 'Añadir lo que ya tiene')}
      {card('a-notes', 'Notas', a.notes.trim().length > 0, <span>{a.notes}</span>, 'Añadir una nota')}
      <p className="label">Regalos anteriores</p>
      {sortedPast.length ? (
        <ul className="list">
          {sortedPast.map((g) => (
            <li key={g.id}>
              <div className="row static">
                <Thumb photo={g.photo} small />
                <span className="grow">
                  <span className="name sm">{g.title}</span>
                  <span className="sub">
                    {occ(g.occasion)?.label || 'Ocasión eliminada'} {g.givenYear}
                  </span>
                </span>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="empty">Lo que compres aparecerá aquí cuando pase la fecha.</p>
      )}
      <div className="danger-zone">
        <button type="button" className="btn btn-danger btn-block" onClick={onDelete}>
          <Trash2 />
          Eliminar a {person.name}
        </button>
      </div>
    </>
  )
}
