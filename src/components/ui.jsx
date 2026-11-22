import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Check, ChevronRight, Gift, X } from 'lucide-react'
import { MONTHS } from '../db'

// Occasion colour as a CSS variable, for dots, chips and tiles.
export const ocStyle = (o) => ({ '--oc': o?.col ? `var(--o-${o.col})` : 'var(--text-dim)' })

export function Sheet({ title, context, onClose, children }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose])
  return createPortal(
    <>
      <div className="scrim" onClick={onClose} />
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title || undefined}>
        <div className="grab" />
        <div className="sheet-head">
          {title ? <h2>{title}</h2> : context}
          <button type="button" className="close" onClick={onClose} aria-label="Cerrar">
            <X />
          </button>
        </div>
        {children}
      </div>
    </>,
    document.body
  )
}

export function Seg({ label, options, value, onChange }) {
  return (
    <div className="seg" role="group" aria-label={label}>
      {options.map(([k, text]) => (
        <button key={k} type="button" aria-pressed={value === k} onClick={() => onChange(k)}>
          {text}
        </button>
      ))}
    </div>
  )
}

export function OccChip({ o, pressed, onClick, count }) {
  return (
    <button type="button" className="chip oc" style={ocStyle(o)} aria-pressed={pressed} onClick={onClick}>
      <span className="odot" aria-hidden="true" />
      {o.label}
      {count !== undefined && <span className="n">{count}</span>}
    </button>
  )
}

export function Switch({ checked, onChange, label, labelledBy }) {
  return (
    <button
      type="button"
      className="switch"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      aria-labelledby={labelledBy}
      onClick={() => onChange(!checked)}
    />
  )
}

export function Tick({ checked, onChange }) {
  return (
    <button
      type="button"
      className="tick"
      aria-pressed={checked}
      aria-label={checked ? 'Marcar como no comprada' : 'Marcar como comprada'}
      onClick={(e) => {
        e.stopPropagation()
        onChange(!checked)
      }}
    >
      <span>
        <Check strokeWidth={2.5} />
      </span>
    </button>
  )
}

export function Thumb({ photo, small }) {
  return (
    <span className={'thumb' + (small ? ' sm' : '')} style={photo ? { backgroundImage: `url(${photo})` } : undefined}>
      {!photo && <Gift />}
    </span>
  )
}

export function DateTile({ date, o }) {
  return (
    <span className="dtile" style={ocStyle(o)} aria-hidden="true">
      <b>{date.getDate()}</b>
      <span>{MONTHS[date.getMonth()]}</span>
    </span>
  )
}

export const Chev = () => <ChevronRight className="chev" />
