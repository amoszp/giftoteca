import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Plus, Search } from 'lucide-react'
import { aboutOf } from '../db'
import { Chev, Thumb } from '../components/ui'
import { PersonForm } from '../components/PersonSheets'

export default function People({ data }) {
  const { people, gifts, active, occ } = data
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [adding, setAdding] = useState(false)
  const q = query.trim().toLowerCase()
  const visible = gifts.filter((g) => active.some((o) => o.k === g.occasion))

  const personRow = (p) => {
    const all = visible.filter((g) => g.personId === p.id)
    const b = all.filter((g) => g.bought).length
    const sub = all.length ? `${all.length} ${all.length === 1 ? 'idea' : 'ideas'}${b ? `, ${b} ${b === 1 ? 'comprada' : 'compradas'}` : ''}` : 'Sin ideas'
    return (
      <li key={p.id}>
        <Link className="row" to={`/personas/${p.id}`}>
          <span className="avatar" aria-hidden="true">{p.name.charAt(0).toUpperCase()}</span>
          <span className="grow">
            <span className="name">{p.name}</span>
            <span className="sub">{sub}</span>
          </span>
          <Chev />
        </Link>
      </li>
    )
  }

  let body
  if (q) {
    const mp = people.filter((p) => p.name.toLowerCase().includes(q) || aboutOf(p).likes.some((l) => l.toLowerCase().includes(q)))
    const mi = visible.filter((g) => g.title.toLowerCase().includes(q))
    const name = (id) => people.find((p) => p.id === id)?.name || ''
    body =
      !mp.length && !mi.length ? (
        <p className="empty">Nada con "{query.trim()}".</p>
      ) : (
        <>
          {mp.length > 0 && (
            <>
              <p className="label">Personas</p>
              <ul className="list">{mp.map(personRow)}</ul>
            </>
          )}
          {mi.length > 0 && (
            <>
              <p className="label">Ideas</p>
              <ul className="list">
                {mi.map((g) => (
                  <li key={g.id}>
                    <Link className="row" to={`/personas/${g.personId}?occ=${g.occasion}&idea=${g.id}`}>
                      <Thumb photo={g.photo} />
                      <span className="grow">
                        <span className="name sm">{g.title}</span>
                        <span className="sub">
                          {name(g.personId)} · {occ(g.occasion)?.label}
                        </span>
                      </span>
                      <Chev />
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      )
  } else {
    body = (
      <ul className="list">
        {people.map(personRow)}
        <li>
          <button type="button" className="row add-row" onClick={() => setAdding(true)}>
            <Plus />
            <span className="grow">
              <span className="name sm">Añadir persona</span>
            </span>
          </button>
        </li>
      </ul>
    )
  }

  return (
    <>
      <div className="search">
        <Search aria-hidden="true" />
        <input className="input" type="search" placeholder="Buscar personas o ideas" aria-label="Buscar personas o ideas" value={query} onChange={(e) => setQuery(e.target.value)} autoComplete="off" />
      </div>
      {body}
      {adding && <PersonForm onClose={() => setAdding(false)} onAdded={(id) => navigate(`/personas/${id}`)} />}
    </>
  )
}
