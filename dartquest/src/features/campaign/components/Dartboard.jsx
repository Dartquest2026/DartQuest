import './Dartboard.css'

const NUMBERS = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5]

function point(radius, angle) {
  const radians = (angle - 90) * Math.PI / 180
  return [120 + radius * Math.cos(radians), 120 + radius * Math.sin(radians)]
}

function ringPath(index, innerRadius, outerRadius) {
  const start = index * 18 - 9
  const end = start + 18
  const [a, b, c, d] = [point(outerRadius, start), point(outerRadius, end), point(innerRadius, end), point(innerRadius, start)]
  return `M ${a.join(' ')} A ${outerRadius} ${outerRadius} 0 0 1 ${b.join(' ')} L ${c.join(' ')} A ${innerRadius} ${innerRadius} 0 0 0 ${d.join(' ')} Z`
}

function getDartboardTargetAreas(target) {
  const label = String(target.label ?? '').toUpperCase()
  if (target.targetType === 'number' && target.number) return ['single-inner', 'triple', 'single-outer', 'double'].map((ring) => `${target.number}:${ring}`)
  if (label === 'SBULL' || label === 'BULL') return ['bull:outer']
  if (label === 'DBULL') return ['bull:inner']
  const match = label.match(/^([SDT])(\d+)$/)
  if (!match) return []
  const rings = match[1] === 'D' ? ['double'] : match[1] === 'T' ? ['triple'] : ['single-inner', 'single-outer']
  return rings.map((ring) => `${Number(match[2])}:${ring}`)
}

function Dartboard({ targets, hitCounters, activeTargetId = null }) {
  const highlighted = new Set()
  const highlightedBulls = new Set()
  targets.forEach((target) => {
    if (activeTargetId && target.id !== activeTargetId) return
    if ((hitCounters[target.id] ?? 0) >= target.requiredHits) return
    getDartboardTargetAreas(target).forEach((area) => {
      if (area.startsWith('bull:')) highlightedBulls.add(area.slice(5))
      else highlighted.add(area)
    })
  })

  const rings = [
    ['single-inner', 18, 73],
    ['triple', 73, 79],
    ['single-outer', 79, 112],
    ['double', 112, 118],
  ]

  return (
    <div className="attempt-dartboard" aria-label="Dartscheibe mit markierten Zielfeldern">
      <svg viewBox="-18 -18 276 276" role="img">
        <circle className="dartboard-rim" cx="120" cy="120" r="137" />
        <circle className="dartboard-base" cx="120" cy="120" r="121" />
        {NUMBERS.flatMap((number, index) => rings.map(([ring, inner, outer]) => (
          <path
            key={`${number}:${ring}`}
            d={ringPath(index, inner, outer)}
            pathLength="1"
            className={`dartboard-field ring-${ring} segment-${index % 2 ? 'light' : 'dark'}${highlighted.has(`${number}:${ring}`) ? ' dartboard-segment--target' : ''}`}
          />
        )))}
        <circle className={`dartboard-bull-outer${highlightedBulls.has('outer') ? ' dartboard-segment--target' : ''}`} cx="120" cy="120" r="17" pathLength="1" />
        <circle className={`dartboard-bull-inner${highlightedBulls.has('inner') ? ' dartboard-segment--target' : ''}`} cx="120" cy="120" r="7" pathLength="1" />
        {NUMBERS.map((number, index) => {
          const [x, y] = point(130, index * 18)
          return <text key={number} x={x} y={y} className="dartboard-number">{number}</text>
        })}
      </svg>
    </div>
  )
}

export default Dartboard
