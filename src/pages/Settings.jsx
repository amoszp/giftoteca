import { useRef, useState } from 'react'
import { ChevronRight, Download, Minus, Plus, Trash2, Upload } from 'lucide-react'
import { deleteAllData, exportData, importData, longDate, nextOccurrence, setOccasionOn, setSetting } from '../db'
import { Seg, Sheet, Switch, ocStyle } from '../components/ui'
import { OccasionForm } from '../components/PersonSheets'
import { useToast } from '../components/Toast'

export default function Settings({ data }) {
  const toast = useToast()
  const { prefs, occasions, gifts } = data
  const [sheet, setSheet] = useState(null) // { type: 'occ', occasion } | { type: 'import', payload }
  const fileRef = useRef(null)
  const setPrefs = (changes) => setSetting('prefs', { ...prefs, ...changes })

  async function toggle(o, on) {
    await setOccasionOn(o.k, on)
    const n = gifts.filter((g) => g.occasion === o.k).length
    if (!on && n) toast(`${o.label} oculta, sus ${n} ${n === 1 ? 'idea se guarda' : 'ideas se guardan'}`)
  }

  async function doExport() {
    const payload = await exportData()
    const date = new Date().toISOString().slice(0, 10)
    const file = new File([JSON.stringify(payload)], `giftoteca-${date}.json`, { type: 'application/json' })
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: 'Copia de Giftoteca' })
        return
      } catch (err) {
        if (err.name === 'AbortError') return
      }
    }
    const url = URL.createObjectURL(file)
    const a = document.createElement('a')
    a.href = url
    a.download = file.name
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    toast('Copia exportada')
  }

  async function pickImport(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      const payload = JSON.parse(await file.text())
      if (payload?.app !== 'giftoteca') throw new Error()
      setSheet({ type: 'import', payload })
    } catch {
      toast('Este archivo no es una copia de Giftoteca')
    }
  }

  async function doImport() {
    const undo = await deleteAllData()
    try {
      await importData(sheet.payload)
      setSheet(null)
      toast('Copia importada', undo)
    } catch (err) {
      await undo()
      setSheet(null)
      toast(err.message)
    }
  }

  async function wipe() {
    const undo = await deleteAllData()
    toast('Datos eliminados', undo)
  }

  const occRow = (o) => {
    const next = nextOccurrence(o)
    const sub = o.k === 'cumpleanos' ? 'La fecha de cada persona' : o.k === 'sin' ? 'Ideas para cualquier momento' : o.rule === 'madre' ? 'Primer domingo de mayo' : longDate(next.date)
    const text = (
      <>
        <span className="odot big" style={ocStyle(o)} aria-hidden="true" />
        <span className="grow">
          <span className="name sm">{o.label}</span>
          <span className="sub">{sub}</span>
        </span>
      </>
    )
    return (
      <li className="set-row" key={o.k}>
        {o.custom ? (
          <button type="button" className="set-open" onClick={() => setSheet({ type: 'occ', occasion: o })}>
            {text}
          </button>
        ) : (
          text
        )}
        {o.fixed ? <span className="fixed-note">Siempre</span> : <Switch checked={o.on} label={o.label} onChange={(v) => toggle(o, v)} />}
      </li>
    )
  }

  return (
    <>
      <p className="label">Apariencia</p>
      <Seg label="Tema" options={[['auto', 'Automático'], ['dark', 'Oscuro'], ['light', 'Claro']]} value={prefs.theme} onChange={(theme) => setPrefs({ theme })} />

      <p className="label">Ocasiones</p>
      <ul className="list">
        {occasions.map(occRow)}
        <li>
          <button type="button" className="row add-row" onClick={() => setSheet({ type: 'occ', occasion: null })}>
            <Plus />
            <span className="grow">
              <span className="name sm">Añadir ocasión</span>
            </span>
          </button>
        </li>
      </ul>

      <p className="label">Fechas cercanas</p>
      <ul className="list">
        <li className="set-row">
          <span className="grow">
            <span className="name sm">En naranja</span>
            <span className="sub">Días antes de la fecha</span>
          </span>
          <span className="stepper">
            <button type="button" aria-label="Un día menos" disabled={prefs.soon <= 1} onClick={() => setPrefs({ soon: prefs.soon - 1 })}>
              <Minus />
            </button>
            <output aria-live="polite">
              {prefs.soon} {prefs.soon === 1 ? 'día' : 'días'}
            </output>
            <button type="button" aria-label="Un día más" disabled={prefs.soon >= 30} onClick={() => setPrefs({ soon: prefs.soon + 1 })}>
              <Plus />
            </button>
          </span>
        </li>
      </ul>

      <p className="label">Copia de seguridad</p>
      <ul className="list">
        <li>
          <button type="button" className="row" onClick={doExport}>
            <Download className="chev" aria-hidden="true" style={{ color: 'var(--accent)' }} />
            <span className="grow">
              <span className="name sm">Exportar copia</span>
            </span>
            <ChevronRight className="chev" />
          </button>
        </li>
        <li>
          <button type="button" className="row" onClick={() => fileRef.current.click()}>
            <Upload className="chev" aria-hidden="true" style={{ color: 'var(--accent)' }} />
            <span className="grow">
              <span className="name sm">Importar copia</span>
            </span>
            <ChevronRight className="chev" />
          </button>
        </li>
      </ul>
      <input ref={fileRef} className="hidden-file" type="file" accept="application/json,.json" tabIndex={-1} aria-hidden="true" onChange={pickImport} />
      <p className="note">Tus personas, ideas y fotos solo están en este dispositivo.</p>

      <div className="danger-zone">
        <button type="button" className="btn btn-danger btn-block" onClick={wipe}>
          <Trash2 />
          Eliminar todos los datos
        </button>
      </div>

      {sheet?.type === 'occ' && <OccasionForm occasion={sheet.occasion} onClose={() => setSheet(null)} />}
      {sheet?.type === 'import' && (
        <Sheet title="Importar copia" onClose={() => setSheet(null)}>
          <p style={{ margin: 0 }}>
            La copia tiene {sheet.payload.people.length} personas y {sheet.payload.gifts.length} ideas. Reemplaza todo lo que hay ahora en Giftoteca; podrás deshacerlo justo después.
          </p>
          <button type="button" className="btn btn-primary btn-block" onClick={doImport}>
            Reemplazar con la copia
          </button>
        </Sheet>
      )}
    </>
  )
}
