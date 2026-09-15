import { NavLink } from 'react-router-dom'
import { Home, Cake, TreePine, Lightbulb, Settings } from 'lucide-react'

const items = [
  { to: '/', label: 'Inicio', Icon: Home, end: true },
  { to: '/cumpleanos', label: 'Cumples', Icon: Cake },
  { to: '/navidad', label: 'Navidad', Icon: TreePine },
  { to: '/ideas', label: 'Ideas', Icon: Lightbulb },
  { to: '/ajustes', label: 'Ajustes', Icon: Settings },
]

export default function BottomNav() {
  return (
    <nav className="bottom-nav">
      <div className="bottom-nav-glass">
        {items.map(({ to, label, Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) => 'bottom-nav-item' + (isActive ? ' active' : '')}
          >
            <span className="bottom-nav-pill">
              <Icon size={22} strokeWidth={2} />
            </span>
            <span className="bottom-nav-label">{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
