export const DART_VALUES = [...new Set([0, 25, 50, ...Array.from({ length: 20 }, (_, i) => i + 1), ...Array.from({ length: 20 }, (_, i) => (i + 1) * 2), ...Array.from({ length: 20 }, (_, i) => (i + 1) * 3)])]
export const DOUBLE_VALUES = [50, ...Array.from({ length: 20 }, (_, i) => (i + 1) * 2)]

export function getMinimumCheckoutDarts(score, maxDarts = 9) {
  const target = Number(score)
  if (!Number.isInteger(target) || target < 2 || target > 501) return null
  let prefixes = new Set([0])
  for (let darts = 1; darts <= maxDarts; darts += 1) {
    if (DOUBLE_VALUES.some((finish) => prefixes.has(target - finish))) return darts
    prefixes = new Set([...prefixes].flatMap((sum) => DART_VALUES.map((value) => sum + value)).filter((sum) => sum < target))
  }
  return null
}

export const isReachableCheckout = (score, allowedDarts) => { const minimum = getMinimumCheckoutDarts(score, allowedDarts); return minimum != null && minimum <= allowedDarts }
export const isBust = (remaining, score, checkout = false) => { const next = Number(remaining) - Number(score); return next < 0 || next === 1 || (next === 0 && !checkout) }
