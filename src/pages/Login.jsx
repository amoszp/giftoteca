import { useState } from 'react'
import { signIn, signUp } from '../lib/account'

/* Sign in (or create an account) with the shared account service. "Ahora no" keeps using the local data. */
export default function Login({ onDone, onLater, reason }) {
  const [mode, setMode] = useState('in')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault()
    if (!username.trim() || !password) return
    setBusy(true)
    setError('')
    try {
      const user = mode === 'in' ? await signIn(username, password) : await signUp(username, password, name)
      onDone(user)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="page login">
      <div className="login-h">
        <h1>{mode === 'in' ? 'Inicia sesión' : 'Crea tu cuenta'}</h1>
        <p>{reason || 'Tus ideas se guardan en tu cuenta y siguen en este dispositivo aunque no tengas conexión.'}</p>
      </div>
      <form className="login-form" onSubmit={submit}>
        {mode === 'up' && (
          <div className="field">
            <label htmlFor="l-name">Nombre (opcional)</label>
            <input id="l-name" className="input" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
          </div>
        )}
        <div className="field">
          <label htmlFor="l-user">Usuario</label>
          <input id="l-user" className="input" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" autoCapitalize="none" autoCorrect="off" spellCheck="false" />
        </div>
        <div className="field">
          <label htmlFor="l-pass">Contraseña</label>
          <input id="l-pass" className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === 'in' ? 'current-password' : 'new-password'} />
        </div>
        {error && (
          <p className="login-error" role="alert">
            {error}
          </p>
        )}
        <button type="submit" className="btn btn-primary btn-block" disabled={busy || !username.trim() || !password}>
          {mode === 'in' ? 'Entrar' : 'Crear cuenta'}
        </button>
      </form>
      <div className="login-alt">
        <button type="button" className="btn btn-sec btn-block" onClick={() => (setMode(mode === 'in' ? 'up' : 'in'), setError(''))}>
          {mode === 'in' ? 'Crear una cuenta' : 'Ya tengo cuenta'}
        </button>
        {onLater && (
          <button type="button" className="btn btn-block login-later" onClick={onLater}>
            Ahora no
          </button>
        )}
      </div>
    </main>
  )
}
