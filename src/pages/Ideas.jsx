import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Gift } from 'lucide-react'
import { setBought } from '../db'
import { OccChip, Seg, Tick, ocStyle } from '../components/ui'
import { IdeaForm, IdeaSheet } from '../components/IdeaSheets'

const EMPTY = {
  todo: 'No queda nada por comprar aquí.',
  done: 'Todavía no has comprado nada aquí.',
  all: 'No hay ideas aquí.',
}

export default function Ideas({ data }) {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const [state, setState] = useState('todo')
  const [sheet, setSheet] = useState(null)
  const occParam = params.get('occ')
  const fOcc = data.active.some((o) => o.k === occParam) ? occParam : 'all'
  const setOcc = (k) => setParams(k === 'all' ? {} : { occ: k }, { replace: true })

  const person = (id) => data.people.find((p) => p.id === id)
  let list = data.gifts.filter((g) => data.active.some((o) => o.k === g.occasion) && person(g.personId))
  if (fOcc !== 'all') list = list.filter((g) => g.occasion === fOcc)
  if (state === 'todo') list = list.filter((g) => !g.bought)
  if (state === 'done') list = list.filter((g) => g.bought)
  list.sort((a, b) => person(a.personId).name.localeCompare(person(b.personId).name, 'es') || a.createdAt - b.createdAt)

  const open = sheet && data.gifts.find((g) => g.id === sheet.id)

  return (
    <>
      <Seg label="Estado" options={[['todo', 'Por comprar'], ['done', 'Compradas'], ['all', 'Todas']]} value={state} onChange={setState} />
      <div className="chips" role="group" aria-label="Ocasión">
        <button type="button" className="chip" aria-pressed={fOcc === 'all'} onClick={() => setOcc('all')}>
          Todas
        </button>
        {data.active.map((o) => (
          <OccChip key={o.k} o={o} pressed={fOcc === o.k} onClick={() => setOcc(o.k)} />
        ))}
      </div>
      {list.length ? (
        <div className="grid">
          {list.map((g) => {
            const o = data.occ(g.occasion)
            return (
              <div className="g-card" key={g.id}>
                <button type="button" className="g-open" onClick={() => setSheet({ type: 'idea', id: g.id })}>
                  <span className="g-photo" style={g.photo ? { backgroundImage: `url(${g.photo})` } : undefined}>
                    {!g.photo && <Gift aria-hidden="true" />}
                  </span>
                  <span className="g-title">{g.title}</span>
                  <span className="g-sub" style={ocStyle(o)}>
                    <span className="odot" aria-hidden="true" />
                    {person(g.personId).name} · {o.label}
                    {g.bought && <span className="tag-ok">Comprada</span>}
                  </span>
                </button>
                <Tick checked={g.bought} onChange={(v) => setBought(g.id, v)} />
              </div>
            )
          })}
        </div>
      ) : (
        <p className="empty">{EMPTY[state]}</p>
      )}
      {open && sheet.type === 'idea' && (
        <IdeaSheet
          gift={open}
          person={person(open.personId)}
          data={data}
          onClose={() => setSheet(null)}
          onEdit={() => setSheet({ type: 'form', id: open.id, initial: { ...open } })}
          onOpenPerson={() => navigate(`/personas/${open.personId}`,{ state: { from: 'Ideas' } })}
        />
      )}
      {sheet?.type === 'form' && <IdeaForm initial={sheet.initial} person={person(sheet.initial.personId)} data={data} onClose={() => setSheet(null)} />}
    </>
  )
}
