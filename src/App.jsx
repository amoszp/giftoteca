import { useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import BottomNav from './components/BottomNav'
import { ToastProvider } from './components/Toast'
import Home from './pages/Home'
import People from './pages/People'
import Person from './pages/Person'
import Ideas from './pages/Ideas'
import Settings from './pages/Settings'
import { archivePastGifts } from './db'
import { useData } from './lib/useData'

const THEME_COLOR = { dark: '#0b0e1c', light: '#dfe4f7' }

function useTheme(theme) {
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = () => {
      const mode = theme === 'auto' ? (mq.matches ? 'dark' : 'light') : theme
      document.documentElement.dataset.theme = mode
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLOR[mode])
    }
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [theme])
}

// Bought ideas move to "Regalos anteriores" the day after their date: on open and when the app comes back.
function useArchive(ready, occasions) {
  const key = occasions.map((o) => o.k + o.on + (o.md || '')).join()
  useEffect(() => {
    if (!ready) return
    const run = () => archivePastGifts(occasions)
    run()
    const onVisible = () => document.visibilityState === 'visible' && run()
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, key])
}

function ScrollTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

export default function App() {
  const data = useData()
  useTheme(data.prefs.theme)
  useArchive(data.ready, data.occasions)

  return (
    <BrowserRouter>
      <ToastProvider>
        <ScrollTop />
        <div className="app-shell">
          <main className="page">
            {data.ready && (
              <Routes>
                <Route path="/" element={<Home data={data} />} />
                <Route path="/personas" element={<People data={data} />} />
                <Route path="/personas/:id" element={<Person data={data} />} />
                <Route path="/ideas" element={<Ideas data={data} />} />
                <Route path="/ajustes" element={<Settings data={data} />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            )}
          </main>
          <BottomNav />
        </div>
      </ToastProvider>
    </BrowserRouter>
  )
}
