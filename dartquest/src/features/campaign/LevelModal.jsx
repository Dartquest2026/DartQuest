import { useEffect, useRef, useState } from 'react'

import HitCounter from './components/HitCounter'
import LevelCompleteAnimation from './components/LevelCompleteAnimation'
import BossDefeatedSequence from './components/BossDefeatedSequence'
import QuickDartInput from './components/QuickDartInput'
import NumericCampaignInput from './components/NumericCampaignInput'
import TimedTaskGame from './components/TimedTaskGame'
import BossRival501 from './components/BossRival501'
import {
  createAbandonedResult,
  createAttemptResult,
  createLevelAttempt,
  createQuickAttemptResult,
  getMinimumDarts,
  isAutoPerfectAttempt,
  isAttemptComplete,
  nextVisit,
  fillCurrentVisitWithMisses,
  registerTargetHit,
  undoLastDart,
} from './utils/levelAttempt'
import './LevelModal.css'
import './CampaignPolish.css'
import { confirmInputModeHint, hasConfirmedInputModeHint } from '../settings/tutorialStorage'
import { shouldShowBossDefeated } from './bossDefeated'
import { getReturnTransitionTiming, RETURN_TRANSITION_PHASES } from './returnTransition'
import { triggerHaptic } from '../settings/haptics'
import { getBossPresentation, getBossPresentationStyle } from './bossPresentation'
import { createBossFinaleResult, isMultiPhaseBoss } from './bossFinale'
import { getCampaignPlayers, nextCampaignPlayerIndex, shouldRotateCampaignTurn } from './multiplayerTurns'

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

  if (attempt.ordered) {
    if (isMultiPhaseBoss(level)) return 'Triff in dieser Reihenfolge:'
    if (targets.length > 4) {
      const aroundTheClock = labels.length === 20 && labels.every((label, index) => new RegExp(`^[SDT]${index + 1}$`, 'i').test(label))
      if (aroundTheClock && labels.every((label) => /^S\d+$/i.test(label))) return 'Triff alle Singlefelder von 1 bis 20.'
      if (aroundTheClock && labels.every((label) => /^D\d+$/i.test(label))) return 'Triff alle Doppelfelder von 1 bis 20.'
      if (aroundTheClock && labels.every((label) => /^T\d+$/i.test(label))) return 'Triff alle Triplefelder von 1 bis 20.'
      if (labels.every((label) => /^S\d+$/i.test(label))) return 'Triff die Singlefelder der Reihe nach.'
      if (labels.every((label) => /^D\d+$/i.test(label))) return 'Triff die Doppelfelder der Reihe nach.'
      if (labels.every((label) => /^T\d+$/i.test(label))) return 'Triff die Triplefelder der Reihe nach.'
      return 'Triff die angezeigten Felder der Reihe nach.'
    }
    return 'In dieser Reihenfolge:'
  }

  if (targets.length === 1) {
    if (/^BULL$/i.test(labels[0])) return 'Triff Single oder Double Bull'
    const targetName = numberTargets ? 'das ' + labels[0] + 'er-Feld' : labels[0]
    if (requiredHits[0] === 1) return 'Triff ' + targetName
    return 'Triff ' + targetName + ' ' + requiredHits[0] + '×'
  }

  if (equalRequirements && requiredHits[0] === 1) {
    return 'Triff ' + joinTargetLabels(labels)
  }

  if (equalRequirements) {
    return joinTargetLabels(labels) + ' · je ' + requiredHits[0] + ' Treffer'
  }

  return 'Ziele: ' + targets.map((target) => target.label + ' (' + target.requiredHits + ')').join(' · ')
}

function LevelModalAttempt({ level, difficulty = 1, profileId, inputModeHintEligible = false, multiplayer = false, playerCount = 1, players = [], campaignType = 'coop', initialActivePlayerIndex = 0, initialAttempt = null, onAttemptChange = () => {}, onVersusLevelComplete = () => {}, onActivePlayerChange = () => {}, onClose, onComplete, onPlayNext, onOpenSettings, onExitCampaign }) {
  const campaignPlayers = getCampaignPlayers(players, multiplayer ? playerCount : 1)
  const boundedInitialPlayerIndex = Math.min(Math.max(initialActivePlayerIndex, 0), campaignPlayers.length - 1)
  const [attempt, setAttempt] = useState(() => initialAttempt ?? { ...createLevelAttempt(level), playerId: multiplayer ? campaignPlayers[boundedInitialPlayerIndex].id : null })
  const [activePlayerIndex, setActivePlayerIndex] = useState(boundedInitialPlayerIndex)
  const [turnStartIndex, setTurnStartIndex] = useState(initialAttempt?.hitHistory?.length ?? 0)
  const [bossPhase, setBossPhase] = useState('targets')
  const [phaseOneResult, setPhaseOneResult] = useState(null)
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
  const [introReady, setIntroReady] = useState(() => document.documentElement.dataset.animations === 'off')
  const [menuOpen, setMenuOpen] = useState(false)
  const [restartConfirmOpen, setRestartConfirmOpen] = useState(false)
  const menuButtonRef = useRef(null)
  const completionStarted = useRef(false)
  const resultDelivered = useRef(false)
  const returnStarted = useRef(false)
  const transitionTimers = useRef([])
  const onCompleteRef = useRef(onComplete)
  const onCloseRef = useRef(onClose)
  const onPlayNextRef = useRef(onPlayNext)
  onCompleteRef.current = onComplete
  onCloseRef.current = onClose
  onPlayNextRef.current = onPlayNext
  const instantMode = document.documentElement.dataset.animations === 'off'

  useEffect(() => {
    if (document.documentElement.dataset.animations === 'off') return undefined
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
    const completeAndContinue = async () => {
      if (resultDelivered.current) return
      resultDelivered.current = true
      try {
        const confirmation = await onCompleteRef.current(level, result)
        if (animationMode === 'off') {
          if (confirmation?.nextLevelId) onPlayNextRef.current(confirmation.nextLevelId)
          else onCloseRef.current()
          return
        }
        if (shouldShowBossDefeated({ level, result, confirmation })) setBossConfirmation(confirmation)
        else setNormalConfirmation(confirmation)
      } catch (error) {
        setProfileSyncError(error?.message || 'XP und Coins konnten nicht gespeichert werden.')
      }
    }

    if (animationMode === 'off') {
      completeAndContinue()
      return undefined
    }
    const completionDelay = level.boss
      ? animationMode === 'reduced' ? 120 : 500
      : 3200
    const timer = setTimeout(completeAndContinue, completionDelay)
    return () => clearTimeout(timer)
  }, [result, level])

  function beginReturnToMap() {
    if (returnStarted.current) return
    returnStarted.current = true
    setReturnTransition(RETURN_TRANSITION_PHASES.fadingOutGame)
  }

  function returnToAttempt() {
    completionStarted.current = false
    resultDelivered.current = false
    returnStarted.current = false
    setNormalConfirmation(null)
    setProfileSyncError('')
    setResult(null)
  }

  useEffect(() => {
    if (returnTransition !== RETURN_TRANSITION_PHASES.fadingOutGame) return undefined
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const animationMode = document.documentElement.dataset.animations
    const timing = getReturnTransitionTiming(animationMode, reducedMotion)
    transitionTimers.current = [
      window.setTimeout(() => setReturnTransition(RETURN_TRANSITION_PHASES.switchingView), timing.switchAt),
      window.setTimeout(() => setReturnTransition(RETURN_TRANSITION_PHASES.fadingInMap), timing.revealAt),
      window.setTimeout(() => {
        setReturnTransition(RETURN_TRANSITION_PHASES.complete)
        onCloseRef.current()
      }, timing.completeAt),
    ]
    return undefined
  }, [returnTransition])

  useEffect(() => () => {
    const timers = transitionTimers.current
    timers.forEach((timer) => window.clearTimeout(timer))
  }, [])

  useEffect(() => {
    if (!autoPerfectPending || !isAutoPerfectAttempt(attempt)) return undefined

    const finishAutoPerfect = () => {
      if (completionStarted.current) return
      const playerResult = { ...createAttemptResult(level, attempt, Date.now(), 3), autoPerfect: true }
      if (finishVersusPlayer(attempt, playerResult)) return
      completionStarted.current = true
      rotateAfterCompletedTask()
      setResult(playerResult)
    }
    if (document.documentElement.dataset.animations === 'off') {
      finishAutoPerfect()
      return undefined
    }
    const timer = window.setTimeout(() => {
      finishAutoPerfect()
    }, 1100)

    return () => window.clearTimeout(timer)
  // Rotation uses the values belonging to the attempt that triggered this effect.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt, autoPerfectPending, level])

  const displayedTask = formatAttemptTitle(level, attempt)
  const orderedTargetLabels = attempt.ordered && attempt.targets.length <= 6 ? attempt.targets.map((target) => target.label).join(' · ') : ''
  const bossPresentation = level.boss ? getBossPresentation(level) : null
  const timedLevel = Number.isFinite(level.timeLimitSeconds) && level.timeLimitSeconds > 0
  const gameplayLayout = bossPhase === 'rival501' ? 'rival501' : timedLevel
    ? 'timed'
    : level.taskType === 'checkout'
      ? 'checkout'
      : level.taskType === 'score'
        ? 'score'
        : 'target'
  const gameplayInteractionDisabled = !introReady || Boolean(result)
  const activePlayer = campaignPlayers[activePlayerIndex] ?? campaignPlayers[0]

  function applyMultiplayerTurn(previousAttempt, nextAttempt) {
    if (!multiplayer || !shouldRotateCampaignTurn(previousAttempt, nextAttempt) || isAttemptComplete(nextAttempt)) return nextAttempt
    const nextIndex = nextCampaignPlayerIndex(activePlayerIndex, campaignPlayers.length)
    if (campaignType === 'versus') {
      onAttemptChange(activePlayer.id, level.id, nextAttempt)
      onActivePlayerChange(nextIndex)
      triggerHaptic('light')
      return nextAttempt
    }
    setActivePlayerIndex(nextIndex)
    onActivePlayerChange(nextIndex)
    setTurnStartIndex(nextAttempt.hitHistory.length)
    triggerHaptic('light')
    return { ...nextAttempt, playerId: campaignPlayers[nextIndex].id }
  }

  function rotateMultiplayerPlayer() {
    if (!multiplayer) return
    setActivePlayerIndex((current) => {
      const nextIndex = nextCampaignPlayerIndex(current, campaignPlayers.length)
      onActivePlayerChange(nextIndex)
      return nextIndex
    })
    triggerHaptic('light')
  }

  function rotateAfterCompletedTask() {
    if (!multiplayer) return
    const nextIndex = nextCampaignPlayerIndex(activePlayerIndex, campaignPlayers.length)
    onActivePlayerChange(nextIndex)
  }

  function finishVersusPlayer(completedAttempt, playerResult) {
    if (!multiplayer || campaignType !== 'versus') return false
    onVersusLevelComplete(activePlayer.id, level, playerResult, completedAttempt)
    triggerHaptic('success')
    return true
  }

  function applyHit(targetId) {
    if (!introReady) return
    const nextAttempt = registerTargetHit(attempt, targetId)
    if (nextAttempt === attempt) return
    if (campaignType === 'versus') onAttemptChange(activePlayer.id, level.id, nextAttempt)
    setAttempt(applyMultiplayerTurn(attempt, nextAttempt))
    if (isAttemptComplete(nextAttempt) && isMultiPhaseBoss(level)) {
      triggerHaptic('success')
      setPhaseOneResult(createAttemptResult(level, nextAttempt, Date.now()))
      setBossPhase('transition')
      const delay = document.documentElement.dataset.animations === 'off' ? 0 : 420
      transitionTimers.current.push(window.setTimeout(() => setBossPhase('rival501'), delay))
    } else if (isAttemptComplete(nextAttempt) && !completionStarted.current) {
      const playerResult = createAttemptResult(level, nextAttempt, Date.now())
      if (finishVersusPlayer(nextAttempt, playerResult)) return
      completionStarted.current = true
      rotateAfterCompletedTask()
      triggerHaptic('success')
      setResult(playerResult)
    } else {
      triggerHaptic('light')
    }
  }

  function finishAttempt(finishingDart) {
    if (!introReady || !isAttemptComplete(attempt) || completionStarted.current) return
    setAutoPerfectPending(false)
    const playerResult = createAttemptResult(level, attempt, Date.now(), finishingDart)
    if (finishVersusPlayer(attempt, playerResult)) return
    completionStarted.current = true
    rotateAfterCompletedTask()
    triggerHaptic('success')
    setResult(playerResult)
  }

  function addVisit() {
    setAutoPerfectPending(false)
    triggerHaptic('light')
    const nextAttempt = nextVisit(attempt)
    if (campaignType === 'versus') onAttemptChange(activePlayer.id, level.id, nextAttempt)
    setAttempt(applyMultiplayerTurn(attempt, nextAttempt))
  }

  function fillVisitWithMisses() {
    setAutoPerfectPending(false)
    triggerHaptic('medium')
    const nextAttempt = fillCurrentVisitWithMisses(attempt)
    if (campaignType === 'versus') onAttemptChange(activePlayer.id, level.id, nextAttempt)
    setAttempt(applyMultiplayerTurn(attempt, nextAttempt))
  }

  function undoPreviousDart() {
    if (multiplayer && attempt.hitHistory.length <= turnStartIndex) return
    triggerHaptic('light')
    setAttempt((current) => {
      const nextAttempt = undoLastDart(current)
      if (campaignType === 'versus') onAttemptChange(activePlayer.id, level.id, nextAttempt)
      return nextAttempt
    })
  }

  function finishQuickAttempt(totalDarts) {
    if (!introReady || completionStarted.current) return
    completionStarted.current = true
    rotateAfterCompletedTask()
    triggerHaptic('success')
    setResult(createQuickAttemptResult(level, totalDarts, attempt.startedAt))
  }

  function finishNumericAttempt(numericResult) {
    if (!introReady || completionStarted.current) return
    if (multiplayer && campaignType === 'versus') {
      onVersusLevelComplete(activePlayer.id, level, numericResult)
      triggerHaptic('success')
      return
    }
    completionStarted.current = true
    rotateAfterCompletedTask()
    triggerHaptic('success')
    setResult(numericResult)
  }

  function finishTimedAttempt(timedResult) {
    if (!introReady || completionStarted.current) return
    if (multiplayer && campaignType === 'versus') {
      onVersusLevelComplete(activePlayer.id, level, timedResult)
      return
    }
    completionStarted.current = true
    rotateAfterCompletedTask()
    setResult(timedResult)
  }

  function finishBossRival(matchResult) {
    if (!matchResult.won || !phaseOneResult || completionStarted.current) return
    completionStarted.current = true
    setBossPhase('completed')
    setResult(createBossFinaleResult(phaseOneResult, matchResult))
  }

  function retryBossFinale() {
    completionStarted.current = false
    resultDelivered.current = false
    setAttempt({ ...createLevelAttempt(level), playerId: multiplayer ? campaignPlayers[0].id : null })
    setActivePlayerIndex(0)
    setTurnStartIndex(0)
    setPhaseOneResult(null)
    setBossPhase('targets')
  }

  function applyInputMode(nextMode) {
    if (level.taskType === 'targets') {
      setAttempt({ ...createLevelAttempt(level), playerId: multiplayer ? campaignPlayers[activePlayerIndex].id : null })
      setTurnStartIndex(0)
    }
    setInputMode(nextMode)
    setPendingInputMode(null)
    localStorage.setItem(INPUT_MODE_STORAGE_KEY, nextMode)
    triggerHaptic('light')
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
    setAttempt({ ...createLevelAttempt(level), playerId: multiplayer ? campaignPlayers[0].id : null })
    setActivePlayerIndex(0)
    setTurnStartIndex(0)
    setPendingInputMode(null)
    setAutoPerfectPending(false)
    setProfileSyncError('')
    setBossConfirmation(null)
    setBossPhase('targets')
    setPhaseOneResult(null)
    setResult(null)
    setRestartConfirmOpen(false)
    setMenuOpen(false)
    if (window.history.state?.dartQuestOverlay === 'level-pause') window.history.back()
  }

  function openPauseMenu() {
    if (!introReady || autoPerfectPending || completionStarted.current || menuOpen) return
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
      <article className={`level-modal layout-${gameplayLayout} ${introReady ? 'is-intro-ready' : 'is-intro-entering'}${level.boss ? ' is-boss-level' : ''}${multiplayer ? ' is-multiplayer' : ''}${result ? ' is-completing' : ''} return-${returnTransition}`} data-gameplay-layout={gameplayLayout} style={{ ...(bossPresentation ? getBossPresentationStyle(bossPresentation) : {}), '--active-player-color': activePlayer.color }} aria-hidden={returnTransition !== RETURN_TRANSITION_PHASES.idle ? 'true' : undefined} inert={returnTransition !== RETURN_TRANSITION_PHASES.idle ? '' : undefined} onClick={(event) => event.stopPropagation()}>
        {!result && <button className="level-modal-close" type="button" onClick={beginReturnToMap} aria-label="Level schließen">×</button>}
        {!result && <div className="level-modal-header-actions">
          <button ref={menuButtonRef} className="level-modal-menu" type="button" onClick={openPauseMenu} disabled={!introReady || autoPerfectPending || completionStarted.current} aria-label="Kampagnenmenü öffnen" aria-expanded={menuOpen}>☰</button>
        </div>}

        {bossPhase === 'rival501' ? (
          <BossRival501 level={level} playerName={activePlayer.name} onWin={finishBossRival} onRetry={retryBossFinale} onBack={onClose} />
        ) : bossPhase === 'transition' ? (
          <div className="boss-phase-transition" role="status"><span>PHASE 1 GESCHAFFT</span><strong>FINALE: 501</strong></div>
        ) : <div className={`level-gameplay-layer${result ? ' is-finished' : ''}`} aria-hidden={result ? 'true' : undefined}>
            {multiplayer ? <header className="level-status-header">
              <p className="level-modal-eyebrow">{level.boss ? `BOSS-LEVEL ${level.id}` : `LEVEL ${level.id}`}</p>
              <p key={activePlayerIndex} className="level-active-player" title={activePlayer.name} aria-label={`Aktiver Spieler: ${activePlayer.name}`}>{activePlayer.name}</p>
            </header> : <p className="level-modal-eyebrow">{level.boss ? `BOSS-LEVEL ${level.id}` : `LEVEL ${level.id}`}</p>}
            {!timedLevel && <h2 className={`level-modal-title${orderedTargetLabels ? ' is-sequence' : ''}`}>{displayedTask}{orderedTargetLabels && <strong>{orderedTargetLabels}</strong>}</h2>}
            {showInputModeHint && !result && (
              <aside className="level-input-mode-hint" id="input-mode-hint" role="status">
                <strong>Du kannst hier jederzeit wechseln.</strong>
                <p>Wechsle zwischen Trefferzähler und Schnelleingabe.</p>
                <button type="button" onClick={dismissInputModeHint}>Verstanden</button>
              </aside>
            )}

            {timedLevel ? (
              <TimedTaskGame key={`${level.id}-${attempt.startedAt}`} level={level} disabled={!introReady || Boolean(result)} onComplete={finishTimedAttempt} />
            ) : level.taskType === 'checkout' || level.taskType === 'score' ? (
              <NumericCampaignInput
                key={campaignType === 'versus' ? `numeric-${activePlayer.id}` : `numeric-${level.id}`}
                level={level}
                disabled={!introReady || Boolean(result)}
                onComplete={finishNumericAttempt}
                inputMode={inputMode}
                inputModeHint={showInputModeHint}
                onToggleInputMode={() => requestInputMode(inputMode === 'counter' ? 'quick' : 'counter')}
                onVisitComplete={rotateMultiplayerPlayer}
                disableCommittedUndo={multiplayer}
                initialAttempt={campaignType === 'versus' ? initialAttempt : null}
                onAttemptChange={campaignType === 'versus' ? (nextAttempt) => onAttemptChange(activePlayer.id, level.id, nextAttempt) : undefined}
              />
            ) : isMultiPhaseBoss(level) || multiplayer || inputMode === 'counter' ? (
              <HitCounter
                attempt={attempt}
                turnStartIndex={multiplayer ? turnStartIndex : null}
                canUndo={!multiplayer ? attempt.totalDarts > 0 : attempt.hitHistory.length > turnStartIndex}
                displayVisits={multiplayer ? Math.floor(attempt.hitHistory.filter((entry) => entry.playerId === activePlayer.id).length / 3) + 1 : attempt.visits}
                displayTotalDarts={multiplayer ? attempt.hitHistory.filter((entry) => entry.playerId === activePlayer.id).length : attempt.totalDarts}
                onHit={applyHit}
                onNextVisit={addVisit}
                onFillMisses={fillVisitWithMisses}
                onPreviousVisit={undoPreviousDart}
                completionPending={false}
                autoPerfectPending={autoPerfectPending}
                onFinish={finishAttempt}
                interactionDisabled={gameplayInteractionDisabled}
                inputModeControl={!isMultiPhaseBoss(level) && !multiplayer ? <button type="button" className={`level-input-mode-switch is-${inputMode}${showInputModeHint ? ' is-coachmark-target' : ''}`} onClick={() => requestInputMode('quick')} disabled={!introReady || Boolean(result)} aria-label="Zur Schnelleingabe wechseln" aria-describedby={showInputModeHint ? 'input-mode-hint' : undefined} title="Treffer zählen"><span aria-hidden="true"><i /></span></button> : null}
              />
            ) : (
              <QuickDartInput
                attempt={attempt}
                minimumDarts={minimumDarts}
                onComplete={finishQuickAttempt}
                disabled={gameplayInteractionDisabled}
                inputModeControl={<button type="button" className={`level-input-mode-switch is-${inputMode}${showInputModeHint ? ' is-coachmark-target' : ''}`} onClick={() => requestInputMode('counter')} disabled={!introReady || Boolean(result)} aria-label="Zum Trefferzähler wechseln" aria-describedby={showInputModeHint ? 'input-mode-hint' : undefined} title="Schnelleingabe"><span aria-hidden="true"><i /></span></button>}
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
        </div>}

        {result && !level.boss && !instantMode && !result.timed && (
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
        {result?.timed && !normalConfirmation && !profileSyncError && <p className="level-profile-sync-status" role="status">Zeit und Fortschritt werden gespeichert …</p>}
        {result && !level.boss && instantMode && profileSyncError && <div className="level-profile-sync-error" role="alert"><strong>Speichern fehlgeschlagen</strong><span>{profileSyncError}</span><button type="button" onClick={onClose}>Zur Karte</button></div>}
        {normalConfirmation && !level.boss && <div className="level-success-actions" role="dialog" aria-modal="true" aria-labelledby="level-success-title"><section><span>DARTQUEST</span><h3 id="level-success-title">Aufgabe erfüllt</h3><p>{result.timed ? `Benötigte Zeit: ${Math.floor(result.elapsedTimeSeconds / 60)}:${String(result.elapsedTimeSeconds % 60).padStart(2, '0')}` : `${result.totalDarts} Darts`}</p><strong className="level-success-stars" aria-label={`${result.stars} Sterne`}>{'★'.repeat(result.stars)}</strong><div className="level-success-rewards"><b>+{normalConfirmation.awardedXP ?? 0} XP</b><b>🪙 +{normalConfirmation.awardedCoins ?? 0} Coins</b></div><button type="button" onClick={returnToAttempt}>ZURÜCK ZUM SPIEL</button><button type="button" onClick={beginReturnToMap}>WEITER ZUR KARTE</button>{normalConfirmation.nextLevelId&&<button className="primary" type="button" onClick={()=>onPlayNext(normalConfirmation.nextLevelId)}>NÄCHSTE AUFGABE</button>}</section></div>}
        {result && level.boss && !bossConfirmation && !profileSyncError && !instantMode && <p className="level-profile-sync-status" role="status">Boss-Abschluss wird gespeichert …</p>}
        {bossConfirmation && <BossDefeatedSequence confirmation={bossConfirmation} result={result} onContinue={beginReturnToMap} onPlayNext={onPlayNext} />}
        {result && level.boss && profileSyncError && <div className="level-profile-sync-error" role="alert"><strong>Speichern fehlgeschlagen</strong><span>{profileSyncError}</span><button type="button" onClick={onClose}>Zur Karte</button></div>}
      </article>
    </div>
  )
}

function LevelModal(props) {
  if (!props.level) return null

  return (
    <LevelModalAttempt
      key={`level-attempt-${props.attemptKey ?? props.level.id}`}
      {...props}
    />
  )
}

export default LevelModal
