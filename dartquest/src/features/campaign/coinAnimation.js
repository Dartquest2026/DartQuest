export function createConfirmedCoinAnimation({ beforeCoins, awardedCoins, afterCoins, rewardConfirmed, id }) {
  const from = Number(beforeCoins)
  const awarded = Number(awardedCoins)
  const to = Number(afterCoins)

  if (rewardConfirmed !== true || !Number.isSafeInteger(from) || !Number.isSafeInteger(awarded)
    || !Number.isSafeInteger(to) || from < 0 || awarded <= 0 || to !== from + awarded) {
    return null
  }

  return { id, from, awarded, to }
}
