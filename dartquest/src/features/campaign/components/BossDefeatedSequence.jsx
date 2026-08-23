import { useCallback, useEffect, useRef } from 'react'
import { getBossUnlockMessage } from '../bossDefeated'
import { getBossPresentation, getBossPresentationStyle } from '../bossPresentation'
import { NewBadge, useNewFeatures } from '../../releases/NewFeatures'
import './BossDefeatedSequence.css'

function BossDefeatedSequence({ confirmation, onContinue, onPlayNext }) {
  const continueButton = useRef(null)
  const handled = useRef(false)
  const historyPushed = useRef(false)
  const stars = Math.max(1, Math.min(4, confirmation.stars))
  const unlockMessage = getBossUnlockMessage(confirmation)
  const presentation = getBossPresentation(confirmation.levelId)
  const { markSeen } = useNewFeatures()

  const continueOnce = useCallback(() => {
    if (handled.current) return
    handled.current = true
    onContinue()
  }, [onContinue])

  const requestContinue = useCallback(() => {
    if (window.history.state?.dartQuestOverlay === 'boss-result') window.history.back()
    else continueOnce()
  }, [continueOnce])

  const playNext = useCallback(() => {
    if (!confirmation.nextLevelId || handled.current) return
    handled.current = true
    if (window.history.state?.dartQuestOverlay === 'boss-result') window.history.replaceState(null, '')
    onPlayNext(confirmation.nextLevelId)
  }, [confirmation.nextLevelId, onPlayNext])

  useEffect(() => {
    if (!historyPushed.current) {
      window.history.pushState({ dartQuestOverlay: 'boss-result' }, '')
      historyPushed.current = true
    }
    continueButton.current?.focus()
    const seenTimer = window.setTimeout(() => markSeen('boss-victory'), 700)
    const continueOnEscape = (event) => { if (event.key === 'Escape') requestContinue() }
    window.addEventListener('keydown', continueOnEscape)
    window.addEventListener('popstate', continueOnce)
    return () => {
      window.removeEventListener('keydown', continueOnEscape)
      window.clearTimeout(seenTimer)
      window.removeEventListener('popstate', continueOnce)
      if (window.history.state?.dartQuestOverlay === 'boss-result') window.history.replaceState(null, '')
    }
  }, [continueOnce, markSeen, requestContinue])

  return <section className={`boss-defeated boss-theme-${presentation.theme}`} style={getBossPresentationStyle(presentation)} role="dialog" aria-modal="true" aria-labelledby="boss-defeated-title">
    <div className="boss-defeated-emblem" aria-hidden="true"><span>{presentation.symbol || '◆'}</span><i /></div>
    <p>BOSS-LEVEL {confirmation.levelId} <NewBadge featureId="boss-victory" /></p>
    <h2 id="boss-defeated-title">BOSS BESIEGT</h2>
    <div className="boss-defeated-stars" aria-label={`${stars} von 4 Sternen`}>{Array.from({ length: 4 }, (_, index) => <span key={index} className={index < stars ? 'earned' : ''}>★</span>)}</div>
    <div className="boss-defeated-rewards" aria-label="Bestätigte Belohnungen"><span><strong>+{confirmation.awardedXP}</strong> XP</span><span><b aria-hidden="true">🪙</b> <strong>+{confirmation.awardedCoins}</strong> Coins</span></div>
    {unlockMessage && <p className="boss-defeated-unlock">{unlockMessage}</p>}
    {!unlockMessage && <p className="boss-defeated-unlock muted">Dein bestätigtes Ergebnis wurde gespeichert.</p>}
    {confirmation.cardPackGranted && <p className="boss-defeated-pack"><span aria-hidden="true">🎴</span><strong>5ER-SAMMELKARTENPAKET</strong> erhalten</p>}
    <div className="boss-defeated-actions">
      {confirmation.nextLevelId && <button ref={continueButton} type="button" onClick={playNext}>{confirmation.newWorldName ? 'NÄCHSTE AUFGABE DER NEUEN WELT' : 'NÄCHSTE AUFGABE'}</button>}
      <button ref={confirmation.nextLevelId ? undefined : continueButton} type="button" onClick={requestContinue}>{confirmation.newWorldName ? 'WEITER ZUR NEUEN WELT' : 'WEITER ZUR KAMPAGNE'}</button>
    </div>
  </section>
}

export default BossDefeatedSequence
