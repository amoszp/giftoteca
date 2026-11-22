import { NavLink } from 'react-router-dom'
import { Gift, House, Settings, Users } from 'lucide-react'

const items = [
  { to: '/', label: 'Inicio', Icon: House, end: true },
  { to: '/personas', label: 'Personas', Icon: Users },
  { to: '/ideas', label: 'Ideas', Icon: Gift },
  { to: '/ajustes', label: 'Ajustes', Icon: Settings },
]

export default function BottomNav() {
  return (
    <nav className="nav" aria-label="Navegación">
      <div className="nav-inner">
        {items.map(({ to, label, Icon, end }) => (
          <NavLink key={to} to={to} end={end} className={({ isActive }) => (isActive ? 'active' : undefined)}>
            <Icon strokeWidth={2} />
            <span>{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
