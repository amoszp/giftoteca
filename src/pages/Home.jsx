import { Link } from 'react-router-dom'
import { daysText, nextOccurrence } from '../db'
import { progress, stateOf } from '../lib/useData'
import { Chev, DateTile, ocStyle } from '../components/ui'

export default function Home({ data }) {
  const { people, gifts, active, prefs, occ } = data
  if (!people.length) {
    return <p className="empty">Añade a alguien en Personas para empezar.</p>
  }

  const shared = active
    .filter((o) => !o.fixed)
    .map((o) => ({ kind: 'o', o, ...nextOccurrence(o) }))
    .filter((e) => e.date)
  const cumple = occ('cumpleanos')
  const bdays = people
    .map((p) => ({ kind: 'p', p, o: cumple, ...(nextOccurrence(cumple, p) || {}) }))
    .filter((e) => e.date)
  shared.sort((a, b) => a.days - b.days)
  const hero = shared[0]
  const rest = [...shared.slice(1), ...bdays].sort((a, b) => a.days - b.days)
  const daysCls = (n) => (n === 0 ? 'today' : n <= prefs.soon ? 'soon' : '')

  return (
    <>
      {hero && <Countdown hero={hero} people={people} gifts={gifts} />}
      {rest.length > 0 && (
        <>
          <p className="label">Próximas fechas</p>
          <ul className="list">
            {rest.map((e) => {
              const to = e.kind === 'p' ? `/personas/${e.p.id}?occ=cumpleanos` : `/ideas?occ=${e.o.k}`
              const list = e.kind === 'p' ? gifts.filter((g) => g.personId === e.p.id && g.occasion === 'cumpleanos') : gifts.filter((g) => g.occasion === e.o.k)
              return (
                <li key={e.kind + (e.p?.id ?? e.o.k)}>
                  <Link className="row" to={to} state={{ from: 'Inicio' }}>
                    <DateTile date={e.date} o={e.o} />
                    <span className="grow">
                      <span className="name">{e.kind === 'p' ? e.p.name : e.o.label}</span>
                      <span className="sub">{e.kind === 'p' ? `Cumpleaños · ${progress(list)}` : progress(list)}</span>
                    </span>
                    <span className={'days ' + daysCls(e.days)}>{daysText(e.days)}</span>
                    <Chev />
                  </Link>
                </li>
              )
            })}
          </ul>
        </>
      )}
    </>
  )
}

function Countdown({ hero, people, gifts }) {
  const states = people.map((p) => ({ p, s: stateOf(gifts, p.id, hero.o.k) }))
  const pending = states.filter((x) => x.s !== 'ok')
  return (
    <section className="count" style={ocStyle(hero.o)} aria-label={hero.o.label}>
      <h1 className="count-n">
        <b>{hero.days}</b>
        <span>
          {hero.days === 1 ? 'día' : 'días'} para {hero.o.label}
        </span>
      </h1>
      <p className="count-t">{pending.length ? `Falta regalo para ${pending.length} de ${states.length}` : 'Todos tienen regalo'}</p>
      {pending.length > 0 && (
        <div className="pchips">
          {pending.map(({ p, s }) => (
            <Link key={p.id} className="pchip" to={`/personas/${p.id}?occ=${hero.o.k}`} state={{ from: 'Inicio' }}>
              <span className={'st ' + s} aria-hidden="true" />
              {p.name}
            </Link>
          ))}
        </div>
      )}
    </section>
  )
}
