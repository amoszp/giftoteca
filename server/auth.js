/**
 * Sign-in through the shared accounts service, reached over a private Docker network.
 * Every account keeps its own data, so every request needs a session (no LAN shortcut).
 */

const ACCOUNTS_URL = process.env.ACCOUNTS_URL || 'http://accounts:4600'
const SERVICE_TOKEN = process.env.ACCOUNTS_SERVICE_TOKEN || ''
const APP_NAME = 'giftoteca'

export const SESSION_COOKIE = 'giftoteca_session'
const SESSION_MAX_AGE_SECONDS = 180 * 86_400
const COOKIE_SECURE = (process.env.COOKIE_SECURE ?? 'true') !== 'false'

export class AccountsUnavailable extends Error {}

async function call(method, path, body) {
  let res
  try {
    res = await fetch(`${ACCOUNTS_URL}${path}`, {
      method,
      headers: { 'content-type': 'application/json', 'x-service-token': SERVICE_TOKEN },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(5000),
    })
  } catch (err) {
    throw new AccountsUnavailable(String(err))
  }
  if (res.status >= 500) throw new AccountsUnavailable(`accounts service answered ${res.status}`)
  const text = await res.text()
  return { status: res.status, data: text ? JSON.parse(text) : null }
}

export function clientInfo(req) {
  const forwarded = req.get('cf-connecting-ip')?.trim()
  const ip = (forwarded || req.socket.remoteAddress || '').slice(0, 64) || undefined
  const device = (req.get('user-agent') ?? '').slice(0, 300) || undefined
  return { ip, device }
}

export const login = (username, password, client) => call('POST', '/v1/login', { username, password, app: APP_NAME, ...client })
export const signup = (username, password, displayName, client) =>
  call('POST', '/v1/signup', { username, password, displayName, app: APP_NAME, ...client })
export const logout = (token) => call('POST', '/v1/logout', { token })

// Verified tokens are cached briefly so a burst of requests costs one lookup.
const verifyCache = new Map()
const VERIFY_CACHE_MS = 30_000

export async function verify(token) {
  const cached = verifyCache.get(token)
  if (cached && cached.until > Date.now()) return cached.user
  const { status, data } = await call('POST', '/v1/verify', { token })
  if (status !== 200) {
    verifyCache.delete(token)
    return null
  }
  verifyCache.set(token, { user: data.user, until: Date.now() + VERIFY_CACHE_MS })
  return data.user
}

export function forgetToken(token) {
  verifyCache.delete(token)
}

export function readToken(req) {
  const header = req.get('authorization')
  if (header?.startsWith('Bearer ')) return header.slice(7).trim() || null
  for (const part of (req.get('cookie') ?? '').split(';')) {
    const [name, ...value] = part.trim().split('=')
    if (name === SESSION_COOKIE) return decodeURIComponent(value.join('=')) || null
  }
  return null
}

export function setSessionCookie(res, token) {
  const attrs = [`${SESSION_COOKIE}=${encodeURIComponent(token)}`, 'Path=/', 'HttpOnly', 'SameSite=Lax', `Max-Age=${SESSION_MAX_AGE_SECONDS}`]
  if (COOKIE_SECURE) attrs.push('Secure')
  res.setHeader('Set-Cookie', attrs.join('; '))
}

export function clearSessionCookie(res) {
  res.setHeader('Set-Cookie', `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${COOKIE_SECURE ? '; Secure' : ''}`)
}

/** Every API route below this needs a signed-in user (req.user). */
export function requireUser() {
  return async (req, res, next) => {
    const token = readToken(req)
    if (!token) return res.status(401).json({ error: 'login required' })
    try {
      const user = await verify(token)
      if (!user) return res.status(401).json({ error: 'login required' })
      req.user = user
      next()
    } catch (err) {
      if (err instanceof AccountsUnavailable) {
        console.error('[auth] accounts service unavailable:', err.message)
        return res.status(503).json({ error: 'accounts service unavailable' })
      }
      next(err)
    }
  }
}
