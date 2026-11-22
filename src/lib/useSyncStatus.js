import { useSyncExternalStore } from 'react'
import { getStatus, subscribe } from './sync'

export const useSyncStatus = () => useSyncExternalStore(subscribe, getStatus)

const ago = (t) => {
  const s = Math.round((Date.now() - t) / 1000)
  if (s < 60) return 'ahora mismo'
  const m = Math.round(s / 60)
  if (m < 60) return `hace ${m} min`
  const d = new Date(t)
  return `a las ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export function statusText(st) {
  const pend = st.pending ? ` · ${st.pending} ${st.pending === 1 ? 'cambio' : 'cambios'} por subir` : ''
  switch (st.state) {
    case 'syncing':
      return 'Sincronizando'
    case 'offline':
      return `Sin conexión${pend}`
    case 'signedout':
      return `Sesión caducada${pend}`
    case 'error':
      return `No se pudo sincronizar${pend}`
    default:
      return st.lastSync ? `Sincronizado ${ago(st.lastSync)}` : 'Sin sincronizar todavía'
  }
}
