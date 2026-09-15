import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { db } from '../db'

export default function OccasionPage({ occasion, title, icon: Icon, aggregate, linkTo }) {
  const people = useLiveQuery(() => db.people.orderBy('name').toArray(), []) || []
  const gifts =
    useLiveQuery(
      () => (aggregate ? db.gifts.toArray() : db.gifts.where('occasion').equals(occasion).toArray()),
      [occasion, aggregate]
    ) || []

  const rows = people.map((person) => {
    const personGifts = gifts.filter((g) => g.personId === person.id)
    const bought = personGifts.filter((g) => g.bought).length
    return { person, total: personGifts.length, bought }
  })

  return (
    <div className="page">
      <header className="page-header">
        <h1 className="occasion-title">
          <span className="occasion-icon"><Icon size={22} strokeWidth={2} /></span> {title}
        </h1>
      </header>

      {rows.length === 0 && (
        <p className="empty-state">Todavía no tienes personas añadidas. Ve a Ajustes para crear la primera.</p>
      )}

      <ul className="person-list">
        {rows.map(({ person, total, bought }, i) => (
          <li key={person.id} style={{ animationDelay: `${i * 50}ms` }}>
            <Link
              to={linkTo ? linkTo(person.id) : `/persona/${person.id}/${occasion}`}
              className="person-row"
            >
              <span className="person-avatar">{person.name.charAt(0).toUpperCase()}</span>
              <span className="person-name">{person.name}</span>
              <span className="person-progress">
                {total === 0 ? 'Sin ideas' : `${bought}/${total} comprados`}
              </span>
              <ChevronRight size={18} className="person-chevron" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
