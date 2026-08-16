import { useEffect, useRef, useState } from 'react'

import HitCounter from './components/HitCounter'
import LevelCompleteAnimation from './components/LevelCompleteAnimation'
import BossDefeatedSequence from './components/BossDefeatedSequence'
import QuickDartInput from './components/QuickDartInput'
import {
  createAbandonedResult,
  createAttemptResult,
  createLevelAttempt,
  createQuickAttemptResult,
  getMinimumDarts,
  isAutoPerfectAttempt,
  isAttemptComplete,
  nextVisit,
  previousVisit,
  registerTargetHit,
  undoTargetHit,
} from './utils/levelAttempt'
import './LevelModal.css'
import { confirmInputModeHint, hasConfirmedInputModeHint } from '../settings/tutorialStorage'
import { shouldShowBossDefeated } from './bossDefeated'
import { getReturnTransitionTiming, RETURN_TRANSITION_PHASES } from './returnTransition'
import { NewBadge, useNewFeatures } from '../releases/NewFeatures'

const INPUT_MODE_STORAGE_KEY = 'dartquest-gameplay-input-mode'

function formatTaskForDisplay(task) {
  return String(task ?? '').replace(/\s+mit maximal\s+\d+\s+Darts?$/i, '')
}

function joinTargetLabels(labels) {
  if (labels.length < 2) return labels[0] ?? ''
  return labels.slice(0, -1).join(', ') + ' und ' + labels.at(-1)
}

function formatAttemptTitle(level, attempt) {
  const targets = attempt.targets
  if (!targets.length || targets.some((target) => target.targetType === 'task')) {
    return formatTaskForDisplay(level.task)
  }

  const labels = targets.map((target) => target.label)
  const requiredHits = targets.map((target) => target.requiredHits)
  const equalRequirements = requiredHits.every((hits) => hits === requiredHits[0])
  const numberTargets = targets.every((target) => target.targetType === 'number')

  if (targets.length === 1) {
    const targetName = numberTargets ? 'das ' + labels[0] + 'er-Feld' : labels[0]
    if (requiredHits[0] === 1) return 'Triff ' + targetName
    if (requiredHits[0] === 2) return 'Triff ' + targetName + ' zweimal'
    return 'Triff ' + targetName + ' · ' + requiredHits[0] + ' Treffer'
  }

  if (equalRequirements && requiredHits[0] === 1) {
    return 'Triff ' + joinTargetLabels(labels)
  }

  if (equalRequirements) {
    return joinTargetLabels(labels) + ' · je ' + requiredHits[0] + ' Treffer'
  }

  return 'Ziele: ' + targets.map((target) => target.label + ' (' + target.requiredHits + ')').join(' · ')
}

function LevelModalAttempt({ level, difficulty = 1, profileId, inputModeHintEligible = false, multiplayer = false, playerCount = 1, players = [], onClose, onComplete, onOpenSettings, onExitCampaign }) {
  const [attempt, setAttempt] = useState(() => createLevelAttempt(level))
  const minimumDarts = getMinimumDarts(level)
  const [inputMode, setInputMode] = useState(() => {
    const savedMode = localStorage.getItem(INPUT_MODE_STORAGE_KEY)
    return savedMode === 'quick' ? 'quick' : 'counter'
  })
  const [pendingInputMode, setPendingInputMode] = useState(null)
  const [showInputModeHint, setShowInputModeHint] = useState(() => (
    inputModeHintEligible && Number(level?.id) === 1 && !hasConfirmedInputModeHint(profileId, difficulty)
  ))
  const [result, setResult] = useState(null)
  const [autoPerfectPending, setAutoPerfectPending] = useState(false)
  const [returnTransition, setReturnTransition] = useState(RETURN_TRANSITION_PHASES.idle)
  const [normalConfirmation, setNormalConfirmation] = useState(null)
  const [profileSyncError, setProfileSyncError] = useState('')
  const [bossConfirmation, setBossConfirmation] = useState(null)
  const [introReady, setIntroReady] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [restartConfirmOpen, setRestartConfirmOpen] = useState(false)
  const menuButtonRef = useRef(null)
  const completionStarted = useRef(false)
  const resultDelivered = useRef(false)
  const returnStarted = useRef(false)
  const onCompleteRef = useRef(onComplete)
  const onCloseRef = useRef(onClose)
  const { markSeen } = useNewFeatures()
  onCompleteRef.current = onComplete
  onCloseRef.current = onClose

  useEffect(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const timer = window.setTimeout(() => setIntroReady(true), reducedMotion ? 40 : 1200)
    return () => window.clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (!menuOpen) return undefined
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') {
        if (restartConfirmOpen) setRestartConfirmOpen(false)
        else closePauseMenu()
      }
    }
    const closeOnBack = () => {
      setRestartConfirmOpen(false)
      setMenuOpen(false)
      window.setTimeout(() => menuButtonRef.current?.focus(), 0)
    }
    window.addEventListener('keydown', closeOnEscape)
    window.addEventListener('popstate', closeOnBack)
    return () => { window.removeEventListener('keydown', closeOnEscape); window.removeEventListener('popstate', closeOnBack) }
  }, [menuOpen, restartConfirmOpen])

  useEffect(() => {
    if (!showInputModeHint) return undefined
    const timer = window.setTimeout(() => {
      setShowInputModeHint(false)
    }, 6000)
    return () => window.clearTimeout(timer)
  }, [showInputModeHint])

  useEffect(() => {
    if (!result || !level) return undefined
    const animationMode = document.documentElement.dataset.animations
    const completionDelay = level.boss
      ? animationMode === 'off' ? 0 : animationMode === 'reduced' ? 120 : 500
      : 3200
    const timer = setTimeout(async () => {
      if (resultDelivered.current) return
      resultDelivered.current = true
      try {
        const confirmation = await onCompleteRef.current(level, result)
        if (shouldShowBossDefeated({ level, result, confirmation })) setBossConfirmation(confirmation)
        else {
  setNormalConfirmation(confirmation)
  beginReturnToMap()
}
      } catch (error) {
        setProfileSyncError(error?.message || 'XP und Coins konnten nicht gespeichert werden.')
      }
    }, completionDelay)
    return () => clearTimeout(timer)
  }, [result, level])

  function beginReturnToMap() {
    if (returnStarted.current) return
    returnStarted.current = true
    setReturnTransition(RETURN_TRANSITION_PHASES.fadingOutGame)
  }

  useEffect(() => {
    if (returnTransition !== RETURN_TRANSITION_PHASES.fadingOutGame) return undefined
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const animationMode = document.documentElement.dataset.animations
    const timing = getReturnTransitionTiming(animationMode, reducedMotion)
    const timers = [
      window.setTimeout(() => setReturnTransition(RETURN_TRANSITION_PHASES.switchingView), timing.switchAt),
      window.setTimeout(() => { setReturnTransition(RETURN_TRANSITION_PHASES.fadingInMap); markSeen('game-map-crossfade') }, timing.revealAt),
      window.setTimeout(() => {
        setReturnTransition(RETURN_TRANSITION_PHASES.complete)
        onCloseRef.current()
      }, timing.completeAt),
    ]
    return undefined
  }, [markSeen, returnTransition])

  useEffect(() => {
    if (!autoPerfectPending || !isAutoPerfectAttempt(attempt)) return undefined

    const timer = window.setTimeout(() => {
      if (completionStarted.current) return
      completionStarted.current = true
      setResult({
        ...createAttemptResult(level, attempt, Date.now(), 3),
        autoPerfect: true,
      })
    }, 1100)

    return () => window.clearTimeout(timer)
  }, [attempt, autoPerfectPending, level])

  const displayedTask = formatAttemptTitle(level, attempt)
  const playerNames = Array.isArray(players)
    ? players.filter((player) => player?.active !== false).map((player) => player?.name).filter(Boolean)
    : []

  function applyHit(targetId) {
    if (!introReady) return
    const nextAttempt = registerTargetHit(attempt, targetId)
    if (nextAttempt === attempt) return
    setAttempt(nextAttempt)

    if (isAutoPerfectAttempt(nextAttempt) && !completionStarted.current) {
      setAutoPerfectPending(true)
    }
  }

  function finishAttempt(finishingDart) {
    if (!introReady || !isAttemptComplete(attempt) || completionStarted.current) return
    setAutoPerfectPending(false)
    completionStarted.current = true
    setResult(createAttemptResult(level, attempt, Date.now(), finishingDart))
  }

  function addVisit() {
    setAutoPerfectPending(false)
    setAttempt((current) => nextVisit(current))
  }

  function undoHit(targetId) {
    setAutoPerfectPending(false)
    setAttempt((current) => undoTargetHit(current, targetId))
  }

  function finishQuickAttempt(totalDarts) {
    if (!introReady || completionStarted.current) return
    completionStarted.current = true
    setResult(createQuickAttemptResult(level, totalDarts, attempt.startedAt))
  }

  function applyInputMode(nextMode) {
    setAttempt(createLevelAttempt(level))
    setInputMode(nextMode)
    setPendingInputMode(null)
    localStorage.setItem(INPUT_MODE_STORAGE_KEY, nextMode)
  }

  function requestInputMode(nextMode) {
    if (nextMode === inputMode) return
    const counterHasInput = attempt.hitHistory.length > 0 || attempt.visits > 1
    if (inputMode === 'counter' && counterHasInput) {
      setPendingInputMode(nextMode)
      return
    }
    applyInputMode(nextMode)
  }

  function dismissInputModeHint() {
    confirmInputModeHint(profileId, difficulty)
    setShowInputModeHint(false)
  }

  function giveUpLevel() {
    if (resultDelivered.current) return
    resultDelivered.current = true
    onComplete(level, createAbandonedResult(level, attempt))
    onClose()
  }

  function restartLevel() {
    completionStarted.current = false
    resultDelivered.current = false
    setAttempt(createLevelAttempt(level))
    setPendingInputMode(null)
    setAutoPerfectPending(false)
    setProfileSyncError('')
    setBossConfirmation(null)
    setResult(null)
    setRestartConfirmOpen(false)
    setMenuOpen(false)
    if (window.history.state?.dartQuestOverlay === 'level-pause') window.history.back()
  }

  function openPauseMenu() {
    if (!introReady || autoPerfectPending || completionStarted.current || menuOpen) return
    markSeen('campaign-burger-menu')
    window.history.pushState({ dartQuestOverlay: 'level-pause' }, '')
    setMenuOpen(true)
  }

  function closePauseMenu() {
    setRestartConfirmOpen(false)
    if (window.history.state?.dartQuestOverlay === 'level-pause') window.history.back()
    else {
      setMenuOpen(false)
      window.setTimeout(() => menuButtonRef.current?.focus(), 0)
    }
  }

  return (
    <div className={`level-modal-backdrop return-${returnTransition}`} data-return-transition={returnTransition} onClick={result ? undefined : beginReturnToMap}>
      {returnTransition !== RETURN_TRANSITION_PHASES.idle && <div className="level-crossfade-new" aria-hidden="true"><NewBadge featureId="game-map-crossfade" /></div>}
      <article className={`level-modal ${introReady ? 'is-intro-ready' : 'is-intro-entering'}${result ? ' is-completing' : ''} return-${returnTransition}`} aria-hidden={returnTransition !== RETURN_TRANSITION_PHASES.idle ? 'true' : undefined} inert={returnTransition !== RETURN_TRANSITION_PHASES.idle ? '' : undefined} onClick={(event) => event.stopPropagation()}>
        {!result && <button className="level-modal-close" type="button" onClick={beginReturnToMap} aria-label="Level schließen">×</button>}
        {!result && <button ref={menuButtonRef} className="level-modal-menu" type="button" onClick={openPauseMenu} disabled={!introReady || autoPerfectPending || completionStarted.current} aria-label="Kampagnenmenü öffnen" aria-expanded={menuOpen}>☰ <NewBadge featureId="campaign-burger-menu" /></button>}

        <div className={`level-gameplay-layer${result ? ' is-finished' : ''}`} aria-hidden={result ? 'true' : undefined}>
            <p className="level-modal-eyebrow">{level.boss ? `BOSS-LEVEL ${level.id}` : `LEVEL ${level.id}`}</p>
            <h2 className="level-modal-title">{displayedTask}</h2>
            <button
              type="button"
              className={`level-input-mode-switch is-${inputMode}${showInputModeHint ? ' is-coachmark-target' : ''}`}
              onClick={() => requestInputMode(inputMode === 'counter' ? 'quick' : 'counter')}
              disabled={!introReady || Boolean(result)}
              aria-label={inputMode === 'counter' ? 'Zur Schnelleingabe wechseln' : 'Zum Trefferzähler wechseln'}
              aria-describedby={showInputModeHint ? 'input-mode-hint' : undefined}
              title={inputMode === 'counter' ? 'Treffer zählen' : 'Schnelleingabe'}
            >
              <span aria-hidden="true"><i /></span>
              <small>{inputMode === 'counter' ? 'Zähler' : 'Schnell'}</small>
            </button>
            {showInputModeHint && !result && (
              <aside className="level-input-mode-hint" id="input-mode-hint" role="status">
                <strong>Du kannst hier jederzeit wechseln.</strong>
                <p>Wechsle zwischen Trefferzähler und Schnelleingabe.</p>
                <button type="button" onClick={dismissInputModeHint}>Verstanden</button>
              </aside>
            )}
            {multiplayer && (
              <div className="level-modal-multiplayer">
                <strong>👥 {playerCount} Spieler</strong>
                {playerNames.length > 0 && <span>{playerNames.join(' · ')}</span>}
                <span>{level.multiplayerGoal}</span>
              </div>
            )}

            {inputMode === 'counter' ? (
              <HitCounter
                attempt={attempt}
                onHit={applyHit}
                onNextVisit={addVisit}
                onPreviousVisit={() => setAttempt((current) => previousVisit(current))}
                onUndo={undoHit}
                completionPending={isAttemptComplete(attempt)}
                autoPerfectPending={autoPerfectPending}
                onFinish={finishAttempt}
                interactionDisabled={!introReady || Boolean(result)}
              />
            ) : (
              <QuickDartInput
                attempt={attempt}
                minimumDarts={minimumDarts}
                onComplete={finishQuickAttempt}
                disabled={!introReady || Boolean(result)}
              />
            )}
            <button type="button" className="level-giveup-button" onClick={giveUpLevel} disabled={!introReady || Boolean(result)}>Aufgeben</button>

            {pendingInputMode && (
              <div className="level-input-mode-confirm" role="alertdialog" aria-modal="true" aria-labelledby="input-mode-confirm-title">
                <div>
                  <strong id="input-mode-confirm-title">Eingaben zurücksetzen?</strong>
                  <p>Deine bisherigen Eingaben dieses Versuchs werden beim Wechsel verworfen.</p>
                  <span>
                    <button type="button" onClick={() => setPendingInputMode(null)}>Abbrechen</button>
                    <button type="button" onClick={() => applyInputMode(pendingInputMode)}>Wechseln</button>
                  </span>
                </div>
              </div>
            )}
            {menuOpen && <div className="level-pause-backdrop" onClick={closePauseMenu}><section role="dialog" aria-modal="true" aria-labelledby="level-pause-title" onClick={(event) => event.stopPropagation()}><p>DARTQUEST</p><h3 id="level-pause-title">Spiel pausiert</h3><button autoFocus type="button" onClick={closePauseMenu}>WEITERSPIELEN</button><button type="button" onClick={() => { setMenuOpen(false); onOpenSettings(() => menuButtonRef.current?.focus()) }}>EINSTELLUNGEN</button><button type="button" onClick={() => setRestartConfirmOpen(true)}>LEVEL NEU STARTEN</button><button className="danger" type="button" onClick={() => { window.history.replaceState(null, ''); setMenuOpen(false); onExitCampaign() }}>KAMPAGNE VERLASSEN</button>{restartConfirmOpen && <div className="level-restart-confirm" onClick={() => setRestartConfirmOpen(false)}><div role="alertdialog" aria-modal="true" aria-labelledby="level-restart-title" onClick={(event) => event.stopPropagation()}><h4 id="level-restart-title">Level wirklich neu starten?</h4><span>Alle Eingaben dieses Versuchs werden zurückgesetzt.</span><button autoFocus type="button" onClick={() => setRestartConfirmOpen(false)}>ABBRECHEN</button><button className="danger" type="button" onClick={restartLevel}>NEU STARTEN</button></div></div>}</section></div>}
        </div>

        {result && !level.boss && (
          <>
            <LevelCompleteAnimation
              stars={result.stars}
              xp={result.xp}
              coins={result.coins}
              totalDarts={result.totalDarts}
              visits={result.visits}
              isBoss={false}
              levelId={level.id}
              autoPerfect={result.autoPerfect === true}
            />
            {!normalConfirmation && !profileSyncError && <p className="level-profile-sync-status" role="status">XP und Coins werden gespeichert …</p>}
            {profileSyncError && <div className="level-profile-sync-error" role="alert"><strong>Speichern fehlgeschlagen</strong><span>{profileSyncError}</span><button type="button" onClick={onClose}>Zur Karte</button></div>}
          </>
        )}
        {result && level.boss && !bossConfirmation && !profileSyncError && <p className="level-profile-sync-status" role="status">Boss-Abschluss wird gespeichert …</p>}
        {bossConfirmation && <BossDefeatedSequence confirmation={bossConfirmation} onContinue={beginReturnToMap} />}
        {result && level.boss && profileSyncError && <div className="level-profile-sync-error" role="alert"><strong>Speichern fehlgeschlagen</strong><span>{profileSyncError}</span><button type="button" onClick={onClose}>Zur Karte</button></div>}
      </article>
    </div>
  )
}

function LevelModal(props) {
  if (!props.level) return null

  return (
    <LevelModalAttempt
      key={`level-attempt-${props.level.id}`}
      {...props}
    />
  )
}

export default LevelModal
