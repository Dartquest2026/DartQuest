/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { markFeatureSeen, readSeenFeatures, resetSeenFeaturesForTester } from './newFeatureStorage'
import './NewFeatures.css'

const NewFeaturesContext = createContext(null)

export function NewFeaturesProvider({ profileId, children }) {
  const [seen, setSeen] = useState(() => readSeenFeatures(profileId))
  const value = useMemo(() => ({
    isNew: (id) => !seen.has(id),
    markSeen: (id) => setSeen(markFeatureSeen(profileId, id)),
    markAllSeen: (ids) => { ids.forEach((id) => markFeatureSeen(profileId, id)); setSeen(readSeenFeatures(profileId)) },
    resetForTester: () => { resetSeenFeaturesForTester(profileId); setSeen(new Set()) },
  }), [profileId, seen])
  return <NewFeaturesContext.Provider value={value}>{children}</NewFeaturesContext.Provider>
}

export function useNewFeatures() {
  return useContext(NewFeaturesContext) ?? { isNew: () => false, markSeen: () => {}, markAllSeen: () => {}, resetForTester: () => {} }
}

export function NewBadge({ featureId }) {
  const { isNew } = useNewFeatures()
  return isNew(featureId) ? <span className="new-feature-badge" aria-label="Neu">NEW</span> : null
}

export function useVisibleFeature(featureId, dwellMs = 700) {
  const ref = useRef(null)
  const { isNew, markSeen } = useNewFeatures()
  useEffect(() => {
    const node = ref.current
    if (!node || !isNew(featureId) || typeof IntersectionObserver === 'undefined') return undefined
    let timer = null
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && entry.intersectionRatio >= 0.65) timer = window.setTimeout(() => markSeen(featureId), dwellMs)
      else if (timer) window.clearTimeout(timer)
    }, { threshold: [0.65] })
    observer.observe(node)
    return () => { observer.disconnect(); if (timer) window.clearTimeout(timer) }
  }, [dwellMs, featureId, isNew, markSeen])
  return ref
}
