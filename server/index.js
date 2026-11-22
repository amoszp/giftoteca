import express from 'express'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  AccountsUnavailable,
  clearSessionCookie,
  clientInfo,
  forgetToken,
  login,
  logout,
  readToken,
  requireUser,
  setSessionCookie,
  signup,
} from './auth.js'
import { invalidChange, openStore } from './store.js'

const here = fileURLToPath(new URL('.', import.meta.url))
const PORT = Number(process.env.PORT || 3000)
const DATA_DIR = process.env.GIFTOTECA_DATA_DIR || join(here, 'data')
const DIST = resolve(process.env.GIFTOTECA_DIST || join(here, '..', 'dist'))
const MAX_CHANGES = 100

const store = openStore(join(DATA_DIR, 'giftoteca.db'))
const app = express()
app.disable('x-powered-by')
app.set('trust proxy', false)

const api = express.Router()
// Photos travel inside the records, so a batch can be a few MB.
api.use(express.json({ limit: '12mb' }))

const wrap = (fn) => (req, res, next) =>
  Promise.resolve()
    .then(() => fn(req, res))
    .catch((err) => {
      if (err instanceof AccountsUnavailable) return res.status(503).json({ error: 'accounts service unavailable' })
      next(err)
    })

const credentials = (req) => {
  const { username, password } = req.body ?? {}
  if (typeof username !== 'string' || typeof password !== 'string' || !username.trim() || !password) return null
  if (username.length > 64 || password.length > 256) return null
  return { username: username.trim(), password }
}

api.get('/health', (_req, res) => res.json({ ok: true }))

api.post(
  '/login',
  wrap(async (req, res) => {
    const c = credentials(req)
    if (!c) return res.status(401).json({ error: 'wrong username or password' })
    const { status, data } = await login(c.username, c.password, clientInfo(req))
    if (status !== 200) return res.status(status === 429 ? 429 : 401).json({ error: status === 429 ? 'too many attempts' : 'wrong username or password' })
    setSessionCookie(res, data.token)
    res.json({ user: data.user })
  })
)

api.post(
  '/signup',
  wrap(async (req, res) => {
    const c = credentials(req)
    if (!c) return res.status(400).json({ error: 'invalid', message: 'Escribe un usuario y una contraseña.' })
    const displayName = typeof req.body.displayName === 'string' ? req.body.displayName.slice(0, 80) : ''
    const { status, data } = await signup(c.username, c.password, displayName, clientInfo(req))
    if (status !== 201) {
      const message = status === 409 ? 'Ese usuario ya existe.' : status === 429 ? 'Demasiadas cuentas nuevas desde aquí. Prueba más tarde.' : 'No se pudo crear la cuenta.'
      return res.status(status === 409 || status === 429 ? status : 400).json({ error: data?.error || 'invalid', message })
    }
    setSessionCookie(res, data.token)
    res.status(201).json({ user: data.user })
  })
)

api.post(
  '/logout',
  wrap(async (req, res) => {
    const token = readToken(req)
    if (token) {
      forgetToken(token)
      await logout(token)
    }
    clearSessionCookie(res)
    res.status(204).send()
  })
)

api.get('/me', requireUser(), (req, res) => res.json({ user: req.user }))

api.post('/sync', requireUser(), (req, res) => {
  const { since, changes } = req.body ?? {}
  if (!Number.isInteger(since) || since < 0) return res.status(400).json({ error: 'since must be a non-negative integer' })
  if (!Array.isArray(changes) || changes.length > MAX_CHANGES) return res.status(400).json({ error: `changes must be an array of at most ${MAX_CHANGES}` })
  for (const c of changes) {
    const problem = invalidChange(c)
    if (problem) return res.status(400).json({ error: problem })
  }
  res.json(store.sync(req.user.id, since, changes))
})

api.use((_req, res) => res.status(404).json({ error: 'not found' }))
app.use('/api', api)

// ---------- the app itself ----------
// The service worker and the app shell must always be revalidated, otherwise installed copies never see a new release.
const noCache = (res) => res.setHeader('Cache-Control', 'no-cache')
app.use(
  express.static(DIST, {
    index: false,
    setHeaders: (res, path) => {
      if (/[\\/]assets[\\/]/.test(path)) res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
      else if (path.endsWith('sw.js') || path.endsWith('.html') || path.endsWith('.webmanifest')) noCache(res)
    },
  })
)
// Client-side routing: unknown paths get the app shell.
app.get('*', (_req, res) => {
  noCache(res)
  res.sendFile(join(DIST, 'index.html'))
})

app.use((err, _req, res, _next) => {
  if (err.type === 'entity.too.large') return res.status(413).json({ error: 'too large' })
  console.error('[server]', err)
  res.status(500).json({ error: 'server error' })
})

const server = app.listen(PORT, () => console.log(`Giftoteca on :${PORT}, data in ${DATA_DIR}`))
const stop = () => server.close(() => (store.close(), process.exit(0)))
process.on('SIGTERM', stop)
process.on('SIGINT', stop)
