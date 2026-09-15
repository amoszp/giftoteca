import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Search as SearchIcon } from 'lucide-react'
import { db, OCCASION_LABELS } from '../db'

export default function Search() {
  const [query, setQuery] = useState('')
  const people = useLiveQuery(() => db.people.orderBy('name').toArray(), []) || []
  const gifts = useLiveQuery(() => db.gifts.toArray(), []) || []

  const q = query.trim().toLowerCase()
  const matchedPeople = q ? people.filter((p) => p.name.toLowerCase().includes(q)) : []
  const matchedGifts = q ? gifts.filter((g) => g.title.toLowerCase().includes(q)) : []
  const hasResults = matchedPeople.length > 0 || matchedGifts.length > 0

  function personName(personId) {
    return people.find((p) => p.id === personId)?.name || ''
  }

  function personGiftStats(personId) {
    const personGifts = gifts.filter((g) => g.personId === personId)
    return { total: personGifts.length, bought: personGifts.filter((g) => g.bought).length }
  }

  return (
    <div className="page">
      <header className="page-header">
        <Link to="/" className="back-link"><ChevronLeft size={20} strokeWidth={2.5} /> Buscar</Link>
      </header>

      <div className="search-input-wrap">
        <SearchIcon size={18} className="search-input-icon" />
        <input
          type="text"
          placeholder="Buscar personas o ideas"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
        />
      </div>

      {!q && <p className="empty-state">Escribe un nombre o una idea de regalo para buscar.</p>}
      {q && !hasResults && <p className="empty-state">Sin resultados para "{query}".</p>}

      {matchedPeople.length > 0 && (
        <section className="gift-group">
          <h2>Personas</h2>
          <ul className="person-list">
            {matchedPeople.map((person) => {
              const { total, bought } = personGiftStats(person.id)
              return (
                <li key={person.id}>
                  <Link to={`/persona/${person.id}/ideas-resumen`} className="person-row">
                    <span className="person-avatar">{person.name.charAt(0).toUpperCase()}</span>
                    <span className="person-name">{person.name}</span>
                    <span className="person-progress">
                      {total === 0 ? 'Sin ideas' : `${bought}/${total} comprados`}
                    </span>
                    <ChevronRight size={18} className="person-chevron" />
                  </Link>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      {matchedGifts.length > 0 && (
        <section className="gift-group">
          <h2>Ideas</h2>
          <ul className="person-list">
            {matchedGifts.map((gift) => (
              <li key={gift.id}>
                <Link to={`/persona/${gift.personId}/ideas-resumen`} className="person-row">
                  <span className="person-avatar">{personName(gift.personId).charAt(0).toUpperCase()}</span>
                  <span className="search-result-body">
                    <span className="upcoming-name">{gift.title}</span>
                    <span className="upcoming-date">
                      {personName(gift.personId)} · {OCCASION_LABELS[gift.occasion]}
                    </span>
                  </span>
                  <ChevronRight size={18} className="person-chevron" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
