import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router-dom'
import { PartyPopper, ChevronRight, Gift, Search } from 'lucide-react'
import { db, OCCASIONS, daysUntilNextBirthday, formatShortDate } from '../db'

export default function Home() {
  const people = useLiveQuery(() => db.people.orderBy('name').toArray(), []) || []
  const gifts = useLiveQuery(
    () => db.gifts.where('occasion').equals(OCCASIONS.CUMPLEANOS).toArray(),
    []
  ) || []

  const upcoming = people
    .map((person) => ({ person, next: daysUntilNextBirthday(person.birthday) }))
    .filter((row) => row.next)
    .sort((a, b) => a.next.days - b.next.days)

  return (
    <div className="page">
      <header className="page-header">
        <h1 className="occasion-title">
          <span className="occasion-icon home-icon"><PartyPopper size={22} strokeWidth={2} /></span> Próximamente
        </h1>
        <Link to="/buscar" className="occasion-icon" aria-label="Buscar">
          <Search size={20} strokeWidth={2} />
        </Link>
      </header>

      {upcoming.length === 0 && (
        <p className="empty-state">
          Añade la fecha de cumpleaños de alguien en Ajustes para verlo aquí.
        </p>
      )}

      <ul className="upcoming-list">
        {upcoming.map(({ person, next }, i) => {
          const personGifts = gifts.filter((g) => g.personId === person.id)
          const bought = personGifts.filter((g) => g.bought).length
          const urgency = next.days <= 7 ? 'soon' : next.days <= 30 ? 'near' : 'far'
          return (
            <li key={person.id} style={{ animationDelay: `${i * 50}ms` }}>
              <Link
                to={`/persona/${person.id}/${OCCASIONS.CUMPLEANOS}`}
                className={`upcoming-card urgency-${urgency}`}
              >
                <span className="upcoming-avatar">{person.name.charAt(0).toUpperCase()}</span>
                <div className="upcoming-body">
                  <div className="upcoming-main">
                    <span className="upcoming-name">{person.name}</span>
                    <span className="upcoming-date">{formatShortDate(next.date)}</span>
                  </div>
                  <div className="upcoming-meta">
                    <span className="upcoming-days">
                      {next.days === 0 ? 'Hoy' : next.days === 1 ? 'Mañana' : `En ${next.days} días`}
                    </span>
                    <span className="upcoming-progress">
                      <Gift size={13} />
                      {personGifts.length === 0 ? 'Sin ideas todavía' : `${bought}/${personGifts.length} comprados`}
                    </span>
                  </div>
                </div>
                <ChevronRight size={18} className="upcoming-chevron" />
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
