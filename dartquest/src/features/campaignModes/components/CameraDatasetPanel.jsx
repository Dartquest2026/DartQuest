import { useEffect, useRef, useState } from 'react'
import { CAPTURE_CATEGORIES, captureVideoFrame } from '../cameraDataset/captureFrame.js'
import { datasetStore, summarizeDataset } from '../cameraDataset/datasetStore.js'
import { exportDatasetPart, planExport } from '../cameraDataset/datasetExport.js'
import './CameraDatasetPanel.css'

function useBlobUrl(blob) {
  const [resource, setResource] = useState(null)
  useEffect(() => {
    if (!blob) return
    const value = URL.createObjectURL(blob)
    // Synchronize the rendered URL with this external resource's effect lifetime.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setResource({ blob, url: value })
    return () => URL.revokeObjectURL(value)
  }, [blob])
  return blob && resource?.blob === blob ? resource.url : undefined
}
const mb = (bytes) => (bytes / 1024 / 1024).toFixed(1)
export default function CameraDatasetPanel({ getCaptureContext, captureDisabled }) {
  const [category, setCategory] = useState('empty_board'), [draft, setDraft] = useState(null)
  const [records, setRecords] = useState([]), [busy, setBusy] = useState(false), [message, setMessage] = useState('')
  const [loaded, setLoaded] = useState(false), [quota, setQuota] = useState(null), [page, setPage] = useState(0)
  const [viewed, setViewed] = useState(null), [parts, setParts] = useState([]), [archive, setArchive] = useState(null)
  const busyRef = useRef(false), mounted = useRef(false), exportId = useRef('')
  const draftUrl = useBlobUrl(draft?.blob), viewedUrl = useBlobUrl(viewed?.blob), archiveUrl = useBlobUrl(archive?.blob)
  const summary = summarizeDataset(records)
  async function refresh() {
    const values = await datasetStore.list()
    if (!mounted.current) return
    setRecords(values.sort((a, b) => b.timestamp.localeCompare(a.timestamp))); setLoaded(true)
    try { const estimate = await navigator.storage?.estimate?.(); if (mounted.current) setQuota(estimate ?? null) } catch { /* estimate is optional */ }
  }
  useEffect(() => {
    mounted.current = true
    // refresh only sets state after the asynchronous IndexedDB read completes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh().catch((error) => { if (mounted.current) setMessage(error.message) })
    return () => { mounted.current = false }
  }, [])
  async function run(action) {
    if (busyRef.current) return
    busyRef.current = true; setBusy(true); setMessage('')
    try { await action() } catch (error) {
      if (mounted.current) setMessage(error.name === 'QuotaExceededError' ? 'Speicher voll. Vorschau bleibt erhalten. Bitte exportieren und alte Aufnahmen löschen.' : error.message || 'Aktion fehlgeschlagen. Bitte erneut versuchen.')
    } finally { busyRef.current = false; if (mounted.current) setBusy(false) }
  }
  function capture() {
    void run(async () => {
      const { video, ...context } = getCaptureContext()
      const result = await captureVideoFrame(video, { ...context, category, appVersion: import.meta.env.VITE_APP_VERSION ?? null })
      if (mounted.current) setDraft(result)
    })
  }
  function save() {
    void run(async () => {
      await datasetStore.save(draft)
      if (!mounted.current) return
      setDraft(null); setArchive(null); setParts([]); setMessage('Aufnahme gespeichert.'); await refresh()
    })
  }
  function remove(record) {
    void run(async () => {
      await datasetStore.remove(record.id)
      setViewed(null); setArchive(null); setParts([]); setPage(0); await refresh(); setMessage('Aufnahme gelöscht.')
    })
  }
  function prepareExport() {
    void run(async () => {
      const snapshot = await datasetStore.list(), plan = planExport(snapshot)
      if (!plan.length) throw new Error('Der Datensatz ist leer.')
      exportId.current = crypto.randomUUID(); setArchive(null); setParts(plan)
      const blob = await exportDatasetPart(plan[0].records, datasetStore.getImage, { totalParts: plan.length, exportId: exportId.current })
      if (mounted.current) setArchive({ blob, index: 0, name: `dartquest_${exportId.current}_teil_1.zip` })
    })
  }
  function preparePart(index) {
    void run(async () => {
      setArchive(null)
      const blob = await exportDatasetPart(parts[index].records, datasetStore.getImage, { part: index + 1, totalParts: parts.length, exportId: exportId.current })
      if (mounted.current) setArchive({ blob, index, name: `dartquest_${exportId.current}_teil_${index + 1}.zip` })
    })
  }
  async function shareArchive() {
    const file = new File([archive.blob], archive.name, { type: 'application/zip' })
    try { await navigator.share({ files: [file], title: 'DartQuest Datensatz' }) }
    catch (error) { if (error.name !== 'AbortError') setMessage('Teilen nicht möglich. Bitte ZIP HERUNTERLADEN verwenden.') }
  }
  const canShare = archive && navigator.canShare?.({ files: [new File([archive.blob], archive.name, { type: 'application/zip' })] })
  return <div className="camera-dataset-panel">
    <p className="dataset-hint">Entwicklung · Aufnahmen bleiben lokal. Erst SPEICHERN übernimmt ein Bild.</p>
    <div className="dataset-categories" aria-label="Aufnahmeart">{CAPTURE_CATEGORIES.map((item) => <button type="button" key={item.id} aria-pressed={category === item.id} disabled={busy || Boolean(draft)} onClick={() => setCategory(item.id)}>{item.label}</button>)}</div>
    <small>Die Dartanzahl beschreibt alle tatsächlich im Board steckenden Darts. Bei „Bewegt“ und „Sonstiges“ bleibt sie unbekannt.</small>
    {!draft && <button className="dataset-capture" type="button" disabled={busy || captureDisabled} onClick={capture}>{busy ? 'BITTE WARTEN …' : 'AUFNEHMEN'}</button>}
    {draft && <div className="dataset-preview">
      <img src={draftUrl || undefined} alt="Aufnahmevorschau ohne DartQuest-Overlay" />
      <small>{CAPTURE_CATEGORIES.find((item) => item.id === draft.metadata.category)?.label} · {draft.metadata.videoWidth} × {draft.metadata.videoHeight} · {mb(draft.blob.size)} MB</small>
      <div className="dataset-actions"><button type="button" disabled={busy || !loaded} onClick={save}>SPEICHERN</button><button type="button" disabled={busy} onClick={() => setDraft(null)}>VERWERFEN</button><button type="button" disabled={busy || captureDisabled} onClick={capture}>NOCHMAL</button></div>
    </div>}
    <p role="status">{message}</p>
    {!loaded && <button type="button" disabled={busy} onClick={() => void run(refresh)}>BILDSPEICHER ERNEUT LADEN</button>}
    <details><summary>DATENSATZ · {summary.total} Bilder · {mb(summary.bytes)} MB</summary>
      <div className="dataset-counts">{CAPTURE_CATEGORIES.map((item) => <span key={item.id}>{item.label}: {summary.categories[item.id] ?? 0}</span>)}</div>
      <p>Gesamt: {summary.total}</p>
      <small>{quota?.quota != null && quota?.usage != null ? `Browser-Schätzung: ${mb(Math.max(0, quota.quota - quota.usage))} MB verfügbar. ` : ''}Browserdaten können gelöscht werden. Regelmäßig exportieren.</small>
      <div className="dataset-records">{records.slice(page * 8, page * 8 + 8).map((record) => <button type="button" key={record.id} disabled={busy} onClick={() => void run(async () => { const blob = await datasetStore.getImage(record.id); if (!blob) throw new Error('Bild nicht mehr vorhanden.'); setViewed({ record, blob }) })}>{CAPTURE_CATEGORIES.find((item) => item.id === record.category)?.label} · {new Date(record.timestamp).toLocaleString()}</button>)}</div>
      {records.length > 8 && <div className="dataset-actions"><button type="button" disabled={!page} onClick={() => setPage(page - 1)}>ZURÜCK</button><span>{page + 1} / {Math.ceil(records.length / 8)}</span><button type="button" disabled={(page + 1) * 8 >= records.length} onClick={() => setPage(page + 1)}>WEITER</button></div>}
      {viewed && <div className="dataset-preview"><img src={viewedUrl || undefined} alt="Gespeicherte Aufnahme zur Kontrolle" /><small>{viewed.record.id}</small><div className="dataset-actions"><button type="button" disabled={busy} onClick={() => remove(viewed.record)}>DIESE AUFNAHME LÖSCHEN</button><button type="button" onClick={() => setViewed(null)}>SCHLIESSEN</button></div></div>}
    </details>
    <button type="button" disabled={busy || !summary.total} onClick={prepareExport}>EXPORT DATENSATZ</button>
    {parts.length > 1 && <div><small>Export in {parts.length} ZIP-Teilen (je ca. 50 MB). Bitte jeden Teil sichern.</small><div className="dataset-actions">{parts.map((_, index) => <button key={index} type="button" disabled={busy} onClick={() => preparePart(index)}>TEIL {index + 1}</button>)}</div></div>}
    {archive && <div className="dataset-actions"><a href={archiveUrl} download={archive.name}>ZIP HERUNTERLADEN · Teil {archive.index + 1}</a>{canShare && <button type="button" onClick={() => void shareArchive()}>ZIP TEILEN / IN DATEIEN SICHERN</button>}</div>}
  </div>
}

