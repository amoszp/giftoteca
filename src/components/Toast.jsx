import { createContext, useCallback, useContext, useRef, useState } from 'react'

const ToastContext = createContext(() => {})

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null)
  const timer = useRef(null)

  const show = useCallback((text, undo) => {
    clearTimeout(timer.current)
    setToast({ text, undo, key: Date.now() })
    timer.current = setTimeout(() => setToast(null), 5000)
  }, [])

  async function handleUndo() {
    const fn = toast?.undo
    clearTimeout(timer.current)
    setToast(null)
    if (fn) await fn()
  }

  return (
    <ToastContext.Provider value={show}>
      {children}
      {toast && (
        <div className="toast" role="status" key={toast.key}>
          <span>{toast.text}</span>
          {toast.undo && <button type="button" onClick={handleUndo}>Deshacer</button>}
        </div>
      )}
    </ToastContext.Provider>
  )
}

export const useToast = () => useContext(ToastContext)
