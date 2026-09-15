import { Check } from 'lucide-react'

export default function GlassCheckbox({ checked, onChange }) {
  return (
    <label className="glass-checkbox">
      <input type="checkbox" checked={checked} onChange={onChange} />
      <span className="glass-checkbox-box">
        <Check size={14} strokeWidth={3} />
      </span>
    </label>
  )
}
