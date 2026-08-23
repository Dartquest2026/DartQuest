const FINISHERS = [
  ...Array.from({ length: 20 }, (_, index) => ({ notation: `D${index + 1}`, score: (index + 1) * 2, multiplier: 'double', number: index + 1 })),
  { notation: 'Bull', score: 50, multiplier: 'bull', number: 25 },
]

const OPENING_FIELDS = [
  ...Array.from({ length: 20 }, (_, index) => ({ notation: `T${20 - index}`, score: (20 - index) * 3, multiplier: 'triple', number: 20 - index })),
  ...Array.from({ length: 20 }, (_, index) => ({ notation: `${20 - index}`, score: 20 - index, multiplier: 'single', number: 20 - index })),
  { notation: '25', score: 25, multiplier: 'outerBull', number: 25 },
  ...Array.from({ length: 20 }, (_, index) => ({ notation: `D${20 - index}`, score: (20 - index) * 2, multiplier: 'double', number: 20 - index })),
  { notation: 'Bull', score: 50, multiplier: 'bull', number: 25 },
]

const FIELD_BY_NOTATION = new Map([...OPENING_FIELDS, ...FINISHERS].map((field) => [field.notation, field]))
export const BOGEY_NUMBERS = Object.freeze([159, 162, 163, 165, 166, 168, 169])

function parsePreferredRoutes(source) {
  return Object.freeze(Object.fromEntries(source.trim().split('\n').map((line) => {
    const [score, route] = line.trim().split(':')
    return [Number(score), route.trim().split(/\s+/).map((notation) => notation === 'DB' || notation === 'D25' ? 'Bull' : notation === 'SB' || notation === 'S25' ? '25' : notation.replace(/^S/, ''))]
  })))
}

// Standardwege aus der gelieferten 3-Dart-Tabelle. Bogey-Zahlen fehlen absichtlich.
const PREFERRED_THREE_DART_ROUTES = parsePreferredRoutes(`
170:T20 T20 Bull
167:T20 T19 Bull
164:T20 T18 Bull
161:T20 T17 Bull
160:T20 T20 D20
158:T20 T20 D19
157:T20 T19 D20
156:T20 T20 D18
155:T20 T19 D19
154:T20 T18 D20
153:T20 T19 D18
152:T20 T20 D16
151:T20 T17 D20
150:T20 T18 D18
149:T20 T19 D16
148:T20 T20 D14
147:T20 T17 D18
146:T20 T18 D16
145:T20 T19 D14
144:T20 T20 D12
143:T20 T17 D16
142:T20 T14 D20
141:T20 T19 D12
140:T20 T20 D10
139:T20 T13 D20
138:T20 T18 D12
137:T20 T19 D10
136:T20 T20 D8
135:25 T20 Bull
134:T20 T16 D13
133:T20 T19 D8
132:Bull Bull D16
131:T20 T13 D16
130:T20 T20 D5
129:T19 T16 D12
128:T18 T14 D16
127:T20 T17 D8
126:T19 T19 D6
125:T18 T19 D7
124:T20 T14 D11
123:T19 T16 D9
122:T18 T18 D7
121:T20 T11 D14
120:T20 20 D20
119:T19 T12 D13
118:T20 18 D20
117:T20 17 D20
116:T19 19 D20
115:T20 15 D20
114:T18 20 D20
113:T19 16 D20
112:T20 T12 D8
111:T19 14 D20
110:T19 13 D20
109:T20 9 D20
108:T20 16 D16
107:T19 T10 D10
106:T20 10 D18
105:T20 13 D16
104:T19 7 D20
103:T19 6 D20
102:T20 10 D16
101:T20 9 D16
100:T20 D20
99:T19 10 D16
98:T20 D19
97:T19 D20
96:T20 D18
95:T19 D19
94:T18 D20
93:T19 D18
92:T20 D16
91:T17 D20
90:T20 D15
89:T19 D16
88:T20 D14
87:T17 D18
86:T18 D16
85:T15 D20
84:T20 D12
83:T17 D16
82:Bull D16
81:T19 D12
80:T20 D10
79:T19 D11
78:T18 D12
77:T19 D10
76:T20 D8
75:T17 D12
74:T14 D16
73:T19 D8
72:T16 D12
71:T13 D16
70:T18 D8
69:T19 D6
68:T20 D4
67:T17 D8
66:T10 D18
65:T11 D16
64:T16 D8
63:T13 D12
62:T10 D16
61:T15 D8
60:20 D20
59:19 D20
58:18 D20
57:17 D20
56:16 D20
55:15 D20
54:14 D20
53:13 D20
52:12 D20
51:11 D20
50:10 D20
49:9 D20
48:16 D16
47:7 D20
46:6 D20
45:5 D20
44:12 D16
43:3 D20
42:10 D16
41:9 D16
40:D20
`)

const PREFERRED_TWO_DART_ROUTES = parsePreferredRoutes(`
110:T20 Bull
107:T19 Bull
104:T18 Bull
101:T17 Bull
100:T20 D20
98:T20 D19
97:T19 D20
96:T20 D18
95:T19 D19
94:T18 D20
93:T19 D18
92:T20 D16
91:T17 D20
90:T18 D18
89:T19 D16
88:T20 D14
87:T17 D18
86:T18 D16
85:T15 D20
84:T20 D12
83:T17 D16
82:T14 D20
81:T15 D18
80:T20 D10
79:T19 D11
78:T18 D12
77:T19 D10
76:T20 D8
75:T17 D12
74:T14 D16
73:T19 D8
72:T16 D12
71:T13 D16
70:T20 D5
69:T19 D6
68:T18 D7
67:T17 D8
66:T16 D9
65:T15 D10
64:T14 D11
63:T13 D12
62:T12 D13
61:T11 D14
60:20 D20
59:19 D20
58:18 D20
57:17 D20
56:16 D20
55:15 D20
54:14 D20
53:13 D20
52:12 D20
51:11 D20
50:10 D20
49:9 D20
48:8 D20
47:7 D20
46:6 D20
45:5 D20
44:4 D20
43:3 D20
42:2 D20
41:1 D20
40:20 D10
`)

function routeKey(route) {
  return route.map((field) => field.notation).join(' → ')
}

function isValidRoute(route, score, dartsRemaining) {
  return route.length <= dartsRemaining && route.reduce((sum, field) => sum + field.score, 0) === score && ['double', 'bull'].includes(route.at(-1)?.multiplier)
}

function routeRank(route) {
  const awkwardDouble = route.at(-1).number === 1 ? 30 : 0
  const singles = route.filter((field) => field.multiplier === 'single').length * 8
  const openingPower = route.slice(0, -1).reduce((sum, field) => sum + (field.multiplier === 'triple' ? field.score : 0), 0)
  return route.length * 100 + awkwardDouble + singles - openingPower / 10
}

const CLEAN_DOUBLE_REMAINDERS = [32, 24, 16, 12, 8, 40, 36, 20, 4, 2]

function preferredLowCheckout(target) {
  const direct = FINISHERS.find((field) => field.score === target)
  if (direct) return [direct]
  for (const remainder of CLEAN_DOUBLE_REMAINDERS) {
    const single = target - remainder
    if (single < 1 || single > 20) continue
    const first = FIELD_BY_NOTATION.get(String(single))
    const finish = FINISHERS.find((field) => field.score === remainder)
    if (first && finish) return [first, finish]
  }
  return null
}

const routeCache = new Map()

export function checkoutRoutes(score, dartsRemaining = 3, limit = 12) {
  const target = Number(score)
  const darts = Math.max(0, Math.min(3, Number(dartsRemaining) || 0))
  if (!Number.isInteger(target) || target < 2 || target > 170 || darts === 0) return []
  const cacheKey = `${target}:${darts}:${limit}`
  if (routeCache.has(cacheKey)) return routeCache.get(cacheKey)

  const routes = []
  for (const finish of FINISHERS) {
    if (finish.score === target) routes.push([finish])
    if (darts >= 2) {
      for (const first of OPENING_FIELDS) {
        if (first.score + finish.score === target) routes.push([first, finish])
      }
    }
    if (darts >= 3) {
      for (const first of OPENING_FIELDS) {
        for (const second of OPENING_FIELDS) {
          if (first.score + second.score + finish.score === target) routes.push([first, second, finish])
        }
      }
    }
  }

  const unique = [...new Map(routes.map((route) => [routeKey(route), route])).values()]
    .filter((route) => isValidRoute(route, target, darts))
    .filter((route) => target > 60 || route.length === 1 || route[0].multiplier === 'single')
    .sort((left, right) => routeRank(left) - routeRank(right) || routeKey(left).localeCompare(routeKey(right)))

  const lowCheckout = target <= 40 || target === 50 ? preferredLowCheckout(target) : null
  const preferredNotations = darts === 2 ? PREFERRED_TWO_DART_ROUTES[target] : PREFERRED_THREE_DART_ROUTES[target]
  const preferred = lowCheckout ?? preferredNotations?.map((notation) => FIELD_BY_NOTATION.get(notation))
  if (preferred?.every(Boolean) && isValidRoute(preferred, target, darts)) {
    const preferredKey = routeKey(preferred)
    const result = [preferred, ...unique.filter((route) => routeKey(route) !== preferredKey)].slice(0, limit)
    routeCache.set(cacheKey, result)
    return result
  }
  const result = unique.slice(0, limit)
  routeCache.set(cacheKey, result)
  return result
}

export function setupSuggestion(score) {
  const target = Number(score)
  if (!Number.isInteger(target) || target < 2) return null
  const setupFields = OPENING_FIELDS.filter((field) => !['double', 'bull', 'outerBull'].includes(field.multiplier))
  const ranked = setupFields.map((field) => ({ field, remainder: target - field.score }))
    .filter(({ remainder }) => remainder >= 2 && remainder !== 1)
    .sort((left, right) => {
      const leftFinish = checkoutRoutes(left.remainder, 3, 1).length ? 1 : 0
      const rightFinish = checkoutRoutes(right.remainder, 3, 1).length ? 1 : 0
      return rightFinish - leftFinish || right.field.score - left.field.score
    })
  const choice = ranked[0]
  if (!choice) return null
  return {
    field: choice.field,
    remainder: choice.remainder,
    text: `${choice.field.notation}, um ${choice.remainder} Rest für die nächste Aufnahme zu stellen.`,
  }
}

export function getCheckoutAdvice(score, dartsRemaining = 3) {
  const routes = checkoutRoutes(score, dartsRemaining)
  return {
    score: Number(score),
    dartsRemaining: Math.max(0, Math.min(3, Number(dartsRemaining) || 0)),
    routes,
    setup: routes.length ? null : setupSuggestion(score),
  }
}

export function explainField(field) {
  if (field.multiplier === 'triple') return `Triple ${field.number}`
  if (field.multiplier === 'double') return `Doppel ${field.number}`
  if (field.multiplier === 'bull') return 'Inneres Bull (50)'
  if (field.multiplier === 'outerBull') return 'Äußeres Bull (25)'
  return `Einfache ${field.number}`
}

// A checked, reusable table. Bogey numbers intentionally contain no three-dart route.
export const CHECKOUT_TABLE = Object.freeze(Object.fromEntries(
  Array.from({ length: 169 }, (_, index) => {
    const score = index + 2
    return [score, Object.freeze(checkoutRoutes(score, 3).map((route) => Object.freeze(route)))]
  }),
))
