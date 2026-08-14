function toPositiveInteger(value, fallback = 1) {
  const number = Number(value)

  return Number.isFinite(number) && number > 0
    ? Math.round(number)
    : fallback
}


export function getCampaignPlayerCount(settings = {}) {
  if (!settings.multiplayer) {
    return 1
  }

  const activePlayers = Array.isArray(settings.players)
    ? settings.players.filter((player) => player?.active !== false)
    : []

  const count = activePlayers.length || toPositiveInteger(settings.playerCount)

  return Math.min(4, Math.max(1, count))
}


function scaleTaskText(task, factor, scaledPerfectDarts) {
  if (typeof task !== 'string' || factor <= 1) {
    return task
  }

  const checkout = task.match(/^Checke\s+(\d+)/i)

  if (checkout) {
    return `Schafft ${factor} erfolgreiche Checkouts von ${checkout[1]}`
  }

  if (task.includes('→')) {
    const sequence = task
      .replace(/^Treffe\s+/i, '')
      .replace(/\s+mit(?: maximal)?\s+\d+\s+Darts?$/i, '')

    return `Absolviert ${factor}× die Folge ${sequence}`
  }

  const repeatedScore = task.match(/^Erziele\s+(?:zweimal|2×)\s+(\d+)\s+Punkte$/i)

  if (repeatedScore) {
    return `Erzielt ${2 * factor}× ${repeatedScore[1]} Punkte`
  }

  if (/^Erziele/i.test(task) && /Punkte/i.test(task)) {
    return task
      .replace(/^Erziele/i, 'Erzielt gemeinsam')
      .replace(/(\d+)(?=\s*Punkte)/gi, (value) => String(Number(value) * factor))
      .replace(/(?:in|mit)\s+\d+\s+Darts?/i, `mit insgesamt ${scaledPerfectDarts} Pfeilen`)
  }

  const hitCount = task.match(/^(Treffe)\s+(\d+)×\s+(.+)$/i)

  if (hitCount) {
    return `Trefft insgesamt ${Number(hitCount[2]) * factor}× ${hitCount[3]}`
  }

  const singleTarget = task.match(/^Treffe\s+(.+)$/i)

  if (singleTarget) {
    return `Trefft insgesamt ${factor}× ${singleTarget[1]}`
  }

  return `Absolviert die Aufgabe ${factor}×: ${task}`
}


export function scaleLevelForMultiplayer(level, playerCount) {
  const factor = toPositiveInteger(playerCount)

  if (!level || factor <= 1) {
    return level
  }

  const targetHits = toPositiveInteger(level.targetHits)
  const perfectDarts = toPositiveInteger(level.perfectDarts, targetHits)
  const scaledTargetHits = targetHits * factor
  const scaledPerfectDarts = perfectDarts * factor
  const isCheckout = /^Checke\s+\d+/i.test(level.task ?? '')
  const isSequence = (level.task ?? '').includes('→')
  const isScoring = /Punkte/i.test(level.task ?? '')

  const multiplayerGoal = isCheckout
    ? `${factor} erfolgreiche Checkouts`
    : isSequence
      ? `${factor} vollständige Folgen`
      : isScoring
        ? 'Gemeinsames Punkteziel laut Aufgabe'
        : `${scaledTargetHits} Treffer insgesamt`

  return {
    ...level,
    task: scaleTaskText(level.task, factor, scaledPerfectDarts),
    targets: Array.isArray(level.targets)
      ? level.targets.map((target) => ({
          ...target,
          requiredHits: toPositiveInteger(target.requiredHits) * factor,
        }))
      : level.targets,
    sequence: Array.isArray(level.sequence)
      ? Array.from({ length: factor }, () => level.sequence).flat()
      : level.sequence,
    targetHits: scaledTargetHits,
    perfectDarts: scaledPerfectDarts,
    multiplayerGoal,
  }
}
