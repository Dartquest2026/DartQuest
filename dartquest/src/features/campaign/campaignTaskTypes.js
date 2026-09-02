const SIMPLE_CHECKOUT = /^Checke\s+(\d+)(?:\s+(?:in|mit)\s+(?:maximal\s+)?(\d+)\s+Darts?)?$/i
const SCORE_AT_LEAST = /^Erziele\s+(?:(?:in\s+(\d+)\s+Darts?\s+)|(?:insgesamt\s+))?mindestens\s+(\d+)\s+Punkte(?:\s+mit\s+3\s+Darts?)?$/i
const SCORE_EXACT = /^(?:Erziele|Schaffe|Erreiche)\s+(?:(?:in\s+(\d+)\s+Darts?\s+))?(\d+)\s+Punkte(?:\s+mit\s+(\d+)\s+Darts?)?$/i
const AROUND_CLOCK_TIME = /^Around the Clock\s+1[–-]20\s+in maximal\s+(\d+)\s+Minuten?$/i

function positiveInteger(value) {
  const number = Number(value)
  return Number.isInteger(number) && number > 0 ? number : null
}

export function withCampaignTaskType(level) {
  if (!level) return level
  if (Number.isFinite(level.timeLimitSeconds) && level.timeLimitSeconds > 0) return { ...level, taskType: 'timed' }
  if (level.taskType) return level
  const task = String(level?.task ?? '').trim()
  const timedAround = task.match(AROUND_CLOCK_TIME)
  if (timedAround) {
    return {
      ...level,
      taskType: 'timed',
      timeLimitSeconds: Number(timedAround[1]) * 60,
      orderedTargets: true,
      targets: Array.from({ length: 20 }, (_, index) => ({ id: `S${index + 1}`, label: `S${index + 1}`, requiredHits: 1 })),
    }
  }
  const checkout = task.match(SIMPLE_CHECKOUT)
  if (checkout) return { ...level, taskType: 'checkout', checkoutScore: Number(checkout[1]), dartLimit: positiveInteger(checkout[2]) }

  const atLeast = task.match(SCORE_AT_LEAST)
  if (atLeast) {
    return {
      ...level,
      taskType: 'score',
      targetScore: positiveInteger(level.scoreTarget) ?? Number(atLeast[2]),
      comparison: 'atLeast',
      dartLimit: positiveInteger(atLeast[1]) ?? (task.includes('mit 3 Darts') ? 3 : positiveInteger(level.perfectDarts)),
    }
  }

  const exact = task.match(SCORE_EXACT)
  if (exact) {
    return {
      ...level,
      taskType: 'score',
      targetScore: positiveInteger(level.scoreTarget) ?? Number(exact[2]),
      comparison: 'exact',
      dartLimit: positiveInteger(exact[1]) ?? positiveInteger(exact[3]) ?? positiveInteger(level.perfectDarts),
    }
  }

  return { ...level, taskType: 'targets' }
}

export function classifyCampaignLevels(levels) {
  return levels.map(withCampaignTaskType)
}
