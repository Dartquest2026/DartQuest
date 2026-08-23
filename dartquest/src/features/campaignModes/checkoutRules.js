const regular = new Set([0, 25, 50])
const doubles = new Set([50])
for (let value = 1; value <= 20; value += 1) {
  regular.add(value); regular.add(value * 2); regular.add(value * 3)
  doubles.add(value * 2)
}

export function checkoutDartOptions(score) {
  const target = Number(score)
  if (!Number.isInteger(target) || target < 2 || target > 170) return []
  const options = []
  if (doubles.has(target)) options.push(1)
  if ([...regular].some((first) => doubles.has(target - first))) options.push(2)
  if ([...regular].some((first) => [...regular].some((second) => doubles.has(target - first - second)))) options.push(3)
  return [...new Set(options)]
}

export function checkoutRewards(target, stars) {
  const multiplier = stars === 4 ? 1.5 : stars === 3 ? 1.3 : stars === 2 ? 1.15 : 1
  return {
    xp: Math.round((10 + Math.floor(target / 10) * 2) * multiplier),
    coins: Math.round((5 + Math.floor(target / 20) * 2) * multiplier),
  }
}

export function checkoutStarsForDarts(target, darts) {
  const options = checkoutDartOptions(target)
  const minimumDarts = options[0] ?? 1
  if (darts <= minimumDarts) return 4
  if (darts === minimumDarts + 1) return 3
  if (darts === minimumDarts + 2) return 2
  return 1
}
