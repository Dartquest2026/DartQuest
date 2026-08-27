function safeCount(value) {
  const count = Number(value)
  return Number.isFinite(count) && count > 0 ? count : 0
}

export function calculateCheckoutRate(successfulCheckouts, checkoutDarts) {
  const successful = safeCount(successfulCheckouts)
  const attempts = safeCount(checkoutDarts)
  if (!attempts) return null
  return { percentage: (successful / attempts) * 100, successful, attempts }
}

export function aggregateCheckoutStats(legs = []) {
  return legs.reduce((total, leg) => ({
    successfulCheckouts: total.successfulCheckouts + safeCount(leg.successfulCheckouts ?? leg.checkouts),
    checkoutDarts: total.checkoutDarts + safeCount(leg.checkoutDarts ?? leg.checkoutAttempts),
  }), { successfulCheckouts: 0, checkoutDarts: 0 })
}

export function formatCheckoutStats(successfulCheckouts, checkoutDarts) {
  const rate = calculateCheckoutRate(successfulCheckouts, checkoutDarts)
  if (!rate) return '–'
  const percentage = rate.percentage.toLocaleString('de-DE', { maximumFractionDigits: 1 })
  return `${percentage} % (${rate.successful}/${rate.attempts})`
}
