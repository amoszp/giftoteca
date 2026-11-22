import { useEffect, useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import BottomNav from './components/BottomNav'
import { ToastProvider } from './components/Toast'
import Home from './pages/Home'
import People from './pages/People'
import Person from './pages/Person'
import Ideas from './pages/Ideas'
import Settings from './pages/Settings'
import Login from './pages/Login'
import { archivePastGifts } from './db'
import { useData } from './lib/useData'
import { adoptUser, fetchMe, getAccount } from './lib/account'
import { startSync, syncNow } from './lib/sync'
import { useSyncStatus } from './lib/useSyncStatus'

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
    const run = () => {
      archivePastGifts(occasions)
    }
    run()
    const onVisible = () => {
      if (document.visibilityState === 'visible') run()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, key])
}

/*
 * auth: 'checking' | 'in' (account on this device) | 'out' (server reachable, not signed in → login screen)
 *       | 'later' (no account yet; the app works with local data and offers to sign in)
 */
function useAuth() {
  const [auth, setAuth] = useState('checking')
  useEffect(() => {
    let alive = true
    ;(async () => {
      const account = await getAccount()
      if (account) {
        if (alive) setAuth('in')
        startSync()
        return
      }
      const me = await fetchMe()
      if (!alive) return
      if (me.user) {
        // A valid session cookie but nothing stored here yet (e.g. after clearing the device).
        await adoptUser(me.user)
        setAuth('in')
        startSync()
      } else setAuth(me.offline ? 'later' : 'out')
    })()
    return () => {
      alive = false
    }
  }, [])
  return [auth, setAuth]
}

function ScrollTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

function Banner({ auth, onSignIn }) {
  const sync = useSyncStatus()
  if (auth === 'later') {
    return (
      <div className="banner" role="status">
        <p>Sin cuenta: tus ideas solo están en este dispositivo.</p>
        <button type="button" className="btn" onClick={onSignIn}>Iniciar sesión</button>
      </div>
    )
  }
  if (auth === 'in' && sync.state === 'signedout') {
    return (
      <div className="banner" role="status">
        <p>Tu sesión ha caducado. Tus ideas siguen aquí; inicia sesión para sincronizarlas.</p>
        <button type="button" className="btn" onClick={onSignIn}>Iniciar sesión</button>
      </div>
    )
  }
  return null
}

export default function App() {
  const data = useData()
  const [auth, setAuth] = useAuth()
  const [loginOpen, setLoginOpen] = useState(false)
  useTheme(data.prefs.theme)
  useArchive(data.ready, data.occasions)

  const showLogin = auth === 'out' || loginOpen
  const signedIn = () => {
    setLoginOpen(false)
    setAuth('in')
    startSync()
    syncNow()
  }

  return (
    <BrowserRouter>
      <ToastProvider>
        <ScrollTop />
        <div className="app-shell">
          {auth === 'checking' ? null : showLogin ? (
            <Login
              reason={auth === 'in' ? 'Tu sesión ha caducado. Tus ideas siguen en este dispositivo.' : undefined}
              onDone={signedIn}
              onLater={() => {
                setLoginOpen(false)
                if (auth === 'out') setAuth('later')
              }}
            />
          ) : (
            <>
              <main className="page">
                <Banner
                  auth={auth}
                  onSignIn={() => setLoginOpen(true)}
                />
                {data.ready && (
                  <Routes>
                    <Route path="/" element={<Home data={data} />} />
                    <Route path="/personas" element={<People data={data} />} />
                    <Route path="/personas/:id" element={<Person data={data} />} />
                    <Route path="/ideas" element={<Ideas data={data} />} />
                    <Route path="/ajustes" element={<Settings data={data} auth={auth} onSignIn={() => setLoginOpen(true)} onSignedOut={() => setAuth('out')} />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                )}
              </main>
              <BottomNav />
            </>
          )}
        </div>
      </ToastProvider>
    </BrowserRouter>
  )
}
