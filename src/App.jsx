import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Cake, TreePine, Lightbulb } from 'lucide-react'
import BottomNav from './components/BottomNav'
import Home from './pages/Home'
import OccasionPage from './pages/OccasionPage'
import PersonDetail from './pages/PersonDetail'
import IdeasPersonView from './pages/IdeasPersonView'
import Search from './pages/Search'
import Settings from './pages/Settings'
import { OCCASIONS } from './db'

export default function App() {
  return (
    <BrowserRouter>
      <div className="app-shell">
        <main className="app-content">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route
              path="/cumpleanos"
              element={<OccasionPage occasion={OCCASIONS.CUMPLEANOS} title="Cumpleaños" icon={Cake} />}
            />
            <Route
              path="/navidad"
              element={<OccasionPage occasion={OCCASIONS.NAVIDAD} title="Navidad" icon={TreePine} />}
            />
            <Route
              path="/ideas"
              element={
                <OccasionPage
                  occasion={OCCASIONS.IDEA}
                  title="Ideas"
                  icon={Lightbulb}
                  aggregate
                  linkTo={(personId) => `/persona/${personId}/ideas-resumen`}
                />
              }
            />
            <Route path="/persona/:personId/ideas-resumen" element={<IdeasPersonView />} />
            <Route path="/persona/:personId/:occasion" element={<PersonDetail />} />
            <Route path="/buscar" element={<Search />} />
            <Route path="/ajustes" element={<Settings />} />
          </Routes>
        </main>
        <BottomNav />
      </div>
    </BrowserRouter>
  )
}
