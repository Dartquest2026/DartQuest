import { useEffect, useRef } from 'react'
import { NewBadge, useNewFeatures } from './NewFeatures'
import { CURRENT_RELEASE, RELEASE_DATE, RELEASE_FEATURES } from './releaseManifest'

function ReleaseItem({ feature }) {
  const ref = useRef(null)
  const { markSeen } = useNewFeatures()
  useEffect(() => {
    const node = ref.current
    if (!node || typeof IntersectionObserver === 'undefined') return undefined
    let dwellTimer = null
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && entry.intersectionRatio >= 0.65) dwellTimer = window.setTimeout(() => markSeen(feature.id), 700)
      else if (dwellTimer) window.clearTimeout(dwellTimer)
    }, { threshold: [0.65] })
    observer.observe(node)
    return () => { observer.disconnect(); if (dwellTimer) window.clearTimeout(dwellTimer) }
  }, [feature.id, markSeen])
  return <li ref={ref}><div><strong>{feature.title}</strong><NewBadge featureId={feature.id} /></div><p>{feature.description}</p></li>
}

function WhatsNew({ onBack }) {
  const { markAllSeen, resetForTester } = useNewFeatures()
  return <main className="whats-new-screen">
    <header className="settings-header"><button type="button" onClick={onBack} aria-label="Zurück zu Einstellungen">‹</button><div><span>DARTQUEST</span><h1>WAS IST NEU?</h1></div></header>
    <section><p className="whats-new-version">VERSION {CURRENT_RELEASE} · {new Date(`${RELEASE_DATE}T12:00:00`).toLocaleDateString('de-DE')}</p><h2>Neu im Tester-Build</h2><p>Diese Änderungen sind in deinem aktuellen Build enthalten.</p><ul>{RELEASE_FEATURES.map((feature) => <ReleaseItem key={feature.id} feature={feature} />)}</ul><button className="whats-new-all" type="button" onClick={() => markAllSeen(RELEASE_FEATURES.map((feature) => feature.id))}>ALLE ALS GESEHEN MARKIEREN</button>{import.meta.env.DEV && <button className="whats-new-reset" type="button" onClick={resetForTester}>TESTER: NEW ZURÜCKSETZEN</button>}</section>
  </main>
}

export default WhatsNew
