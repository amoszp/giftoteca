import { clearLocal, db, getSetting } from '../db'
import { syncNow } from './sync'

/* Sign-in with the shared account service, through this app's server. */

async function call(method, path, body) {
  let res
  try {
    res = await fetch(path, {
      method,
      credentials: 'same-origin',
      headers: body ? { 'content-type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    })
  } catch {
    return { offline: true }
  }
  const data = await res.json().catch(() => null)
  return { status: res.status, data }
}

const ERRORS = {
  401: 'Usuario o contraseña incorrectos.',
  409: 'Ese usuario ya existe.',
  429: 'Demasiados intentos. Espera unos minutos.',
  503: 'El servidor de cuentas no responde. Prueba más tarde.',
}

export const getAccount = () => getSetting('account', null)

/** Who the server thinks we are: { user } | { user: null } | { offline: true }. */
export async function fetchMe() {
  const r = await call('GET', '/api/me')
  if (r.offline) return { offline: true }
  if (r.status === 200 && r.data?.user) return { user: r.data.user }
  if (r.status === 401) return { user: null }
  return { offline: true }
}

// The device's data belongs to one account. A different account starts from that account's data.
async function adopt(user) {
  const sync = await getSetting('sync', null)
  if (sync?.owner && sync.owner !== user.id) await clearLocal()
  await db.settings.put({ key: 'account', value: { id: user.id, username: user.username, displayName: user.displayName || '' } })
  const now = await getSetting('sync', { lastSeq: 0 })
  await db.settings.put({ key: 'sync', value: { ...now, owner: user.id } })
  syncNow()
}

export async function signIn(username, password) {
  const r = await call('POST', '/api/login', { username: username.trim(), password })
  if (r.offline) throw new Error('Sin conexión con el servidor. Inténtalo cuando tengas conexión.')
  if (r.status !== 200) throw new Error(ERRORS[r.status] || 'No se pudo iniciar sesión.')
  await adopt(r.data.user)
  return r.data.user
}

export async function signUp(username, password, displayName) {
  const r = await call('POST', '/api/signup', { username: username.trim(), password, displayName: displayName.trim() })
  if (r.offline) throw new Error('Sin conexión con el servidor. Inténtalo cuando tengas conexión.')
  if (r.status !== 201 && r.status !== 200) throw new Error(r.data?.message || ERRORS[r.status] || 'No se pudo crear la cuenta.')
  await adopt(r.data.user)
  return r.data.user
}

/** Only signs out when everything is uploaded, so nothing is lost. */
export async function signOut() {
  const uploaded = await syncNow()
  if (!uploaded) throw new Error('Hay cambios sin subir. Conéctate e inténtalo de nuevo.')
  await call('POST', '/api/logout')
  await clearLocal()
}

/** A valid session cookie but no account stored on this device yet. */
export const adoptUser = (user) => adopt(user)
