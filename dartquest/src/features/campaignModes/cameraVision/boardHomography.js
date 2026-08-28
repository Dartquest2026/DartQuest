function solveLinear(matrix, vector) {
  const size = vector.length, rows = matrix.map((row, index) => [...row, vector[index]])
  for (let column = 0; column < size; column += 1) {
    let pivot = column
    for (let row = column + 1; row < size; row += 1) if (Math.abs(rows[row][column]) > Math.abs(rows[pivot][column])) pivot = row
    if (Math.abs(rows[pivot][column]) < 1e-9) return null
    ;[rows[column], rows[pivot]] = [rows[pivot], rows[column]]
    const divisor = rows[column][column]
    for (let index = column; index <= size; index += 1) rows[column][index] /= divisor
    for (let row = 0; row < size; row += 1) if (row !== column) { const factor = rows[row][column]; for (let index = column; index <= size; index += 1) rows[row][index] -= factor * rows[column][index] }
  }
  return rows.map((row) => row[size])
}

export function findHomography(matches) {
  if (matches.length < 4) return null
  const rows = [], values = []
  for (const { source, target } of matches) {
    const { x, y } = source, { x: u, y: v } = target
    rows.push([x, y, 1, 0, 0, 0, -u * x, -u * y], [0, 0, 0, x, y, 1, -v * x, -v * y]); values.push(u, v)
  }
  const normal = Array.from({ length: 8 }, () => Array(8).fill(0)), rhs = Array(8).fill(0)
  for (let row = 0; row < rows.length; row += 1) for (let i = 0; i < 8; i += 1) { rhs[i] += rows[row][i] * values[row]; for (let j = 0; j < 8; j += 1) normal[i][j] += rows[row][i] * rows[row][j] }
  const solved = solveLinear(normal, rhs)
  return solved ? [...solved, 1] : null
}

export function projectPoint(matrix, point) {
  if (!matrix) return null
  const denominator = matrix[6] * point.x + matrix[7] * point.y + matrix[8]
  if (Math.abs(denominator) < 1e-8) return null
  return { x: (matrix[0] * point.x + matrix[1] * point.y + matrix[2]) / denominator, y: (matrix[3] * point.x + matrix[4] * point.y + matrix[5]) / denominator }
}

export function invertHomography(matrix) {
  if (!matrix) return null
  const [a,b,c,d,e,f,g,h,i] = matrix
  const determinant = a*(e*i-f*h)-b*(d*i-f*g)+c*(d*h-e*g)
  if (Math.abs(determinant) < 1e-9) return null
  return [(e*i-f*h)/determinant,(c*h-b*i)/determinant,(b*f-c*e)/determinant,(f*g-d*i)/determinant,(a*i-c*g)/determinant,(c*d-a*f)/determinant,(d*h-e*g)/determinant,(b*g-a*h)/determinant,(a*e-b*d)/determinant]
}

export function reprojectionError(matrix, matches) {
  if (!matrix || !matches.length) return Infinity
  return Math.sqrt(matches.reduce((sum, match) => { const point = projectPoint(matrix, match.source); return sum + (point.x - match.target.x) ** 2 + (point.y - match.target.y) ** 2 }, 0) / matches.length)
}

export function findHomographyRansac(matches, threshold = 5) {
  if (matches.length < 6) { const matrix = findHomography(matches); return { matrix, inliers: matches, error: reprojectionError(matrix, matches), usedRansac: false } }
  let best = null
  for (let iteration = 0; iteration < Math.min(40, matches.length * 3); iteration += 1) {
    const subset = [0,1,2,3].map((offset) => matches[(iteration * 3 + offset * Math.max(1, Math.floor(matches.length / 4))) % matches.length])
    const matrix = findHomography(subset); if (!matrix) continue
    const inliers = matches.filter((match) => { const point = projectPoint(matrix, match.source); return point && Math.hypot(point.x - match.target.x, point.y - match.target.y) <= threshold })
    if (!best || inliers.length > best.inliers.length) best = { matrix, inliers }
  }
  if (!best || best.inliers.length < 4) return { matrix: null, inliers: [], error: Infinity, usedRansac: true }
  const matrix = findHomography(best.inliers)
  return { matrix, inliers: best.inliers, error: reprojectionError(matrix, best.inliers), usedRansac: true }
}
