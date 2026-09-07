export const BOARD_ORDER = [1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5, 20]
const segmentScoring = Object.freeze({ miss: 0, single: 1, double: 2, triple: 3 })
const bullScoring = Object.freeze({ miss: 0, bull: 1, bullseye: 2 })

export const TRAINING_TEMPLATES = Object.freeze([
  { id:'segment-custom', category:'SCORING', type:'segment', title:'Freies Segment', description:'Trainiere ein frei gewähltes Zahlensegment.', defaults:{ target:17, rounds:10, dartsPerRound:3, scoring:segmentScoring } },
  { id:'segment-20', category:'SCORING', type:'segment', title:'20er-Segment', description:'Sammle Punkte auf dem gesamten 20er-Segment.', defaults:{ target:20, rounds:10, dartsPerRound:3, scoring:segmentScoring } },
  { id:'segment-19', category:'SCORING', type:'segment', title:'19er-Segment', description:'Sammle Punkte auf dem gesamten 19er-Segment.', defaults:{ target:19, rounds:10, dartsPerRound:3, scoring:segmentScoring } },
  { id:'33-darts-20', category:'SCORING', type:'segment', title:'33 Darts auf 20', description:'Nutze 33 Darts für das 20er-Segment.', defaults:{ target:20, totalDarts:33, dartsPerRound:3, scoring:segmentScoring } },
  { id:'33-darts-19', category:'SCORING', type:'segment', title:'33 Darts auf 19', description:'Nutze 33 Darts für das 19er-Segment.', defaults:{ target:19, totalDarts:33, dartsPerRound:3, scoring:segmentScoring } },
  { id:'33-darts-bull', category:'SCORING', type:'bull', title:'33 Darts Bull', description:'Sammle Treffer auf Outer Bull und Bullseye.', defaults:{ totalDarts:33, dartsPerRound:3, scoring:bullScoring } },
  { id:'round-singles', category:'SINGLES', type:'sequence', title:'Round the Board – Singles', description:'Spiele die Singles von 1 bis 20.', defaults:{ targets:Array.from({length:20},(_,i)=>i+1), ring:'single', dartsPerTarget:3, scoring:segmentScoring } },
  { id:'round-doubles', category:'DOUBLES', type:'sequence', title:'Round the Board – Doubles', description:'Spiele D1 bis D20.', defaults:{ targets:Array.from({length:20},(_,i)=>i+1), ring:'double', dartsPerTarget:3, scoring:segmentScoring } },
  { id:'round-triples', category:'TRIPLES', type:'sequence', title:'Round the Board – Triples', description:'Spiele T1 bis T20.', defaults:{ targets:Array.from({length:20},(_,i)=>i+1), ring:'triple', dartsPerTarget:3, scoring:segmentScoring } },
  { id:'around-board-order', category:'AROUND THE CLOCK', type:'sequence', title:'Around the Clock – Board Order', description:'Folge dem Board im Uhrzeigersinn.', defaults:{ targets:BOARD_ORDER, ring:'segment', dartsPerTarget:1, scoring:segmentScoring } },
  { id:'20-19-18', category:'SCORING', type:'sequence', title:'20 – 19 – 18', description:'Jede Aufnahme folgt der Reihenfolge 20, 19, 18.', defaults:{ targets:[20,19,18], ring:'segment', dartsPerTarget:1, repeatRounds:7, scoring:segmentScoring } },
  { id:'bull-training', category:'SCORING', type:'bull', title:'Bull Training', description:'Drei Darts pro Runde auf Bull.', defaults:{ rounds:10, dartsPerRound:3, scoring:bullScoring } },
  { id:'highscore', category:'SCORING', type:'highscore', title:'Highscore', description:'Addiere den echten Score jeder Aufnahme.', defaults:{ rounds:7 } },
  { id:'three-dart-checkouts', category:'CHECKOUTS', type:'checkout', title:'3-Dart-Checkouts', description:'Löse jede Zahl mit maximal drei Darts.', defaults:{ targets:Array.from({length:30},(_,i)=>3+i*2), maxDarts:3, scoring:{ 1:3, 2:2, 3:1, miss:0 } } },
  { id:'catch-40', category:'CHECKOUTS', type:'checkout', title:'Catch 40 · 61–100', description:'Checke jede Zahl mit maximal sechs Darts.', defaults:{ targets:Array.from({length:40},(_,i)=>61+i), maxDarts:6, scoring:{ 2:3, 3:2, 4:1, 5:1, 6:1, miss:0 } } },
])

export function clampTrainingConfig(template, values = {}) {
  const config = structuredClone({ ...template.defaults, ...values })
  if ('target' in config) config.target = Math.min(20, Math.max(1, Math.round(Number(config.target) || 1)))
  if ('rounds' in config) config.rounds = Math.min(50, Math.max(1, Math.round(Number(config.rounds) || 1)))
  if ('repeatRounds' in config) config.repeatRounds = Math.min(30, Math.max(1, Math.round(Number(config.repeatRounds) || 1)))
  if ('dartsPerRound' in config) config.dartsPerRound = Math.min(6, Math.max(1, Math.round(Number(config.dartsPerRound) || 3)))
  if ('totalDarts' in config) config.totalDarts = Math.min(180, Math.max(1, Math.round(Number(config.totalDarts) || 1)))
  if (config.scoring) config.scoring = Object.fromEntries(Object.entries(config.scoring).map(([key,value]) => [key, Math.min(20, Math.max(0, Math.round(Number(value) || 0)))]))
  return config
}

export function createTrainingTask(templateId, overrides = {}) {
  const template = TRAINING_TEMPLATES.find((item) => item.id === templateId)
  if (!template) throw new Error(`Unbekanntes Training: ${templateId}`)
  return { id:template.id, templateId:template.id, type:template.type, category:template.category, title:template.title, description:template.description, scored:overrides.scored ?? true, configuration:clampTrainingConfig(template, overrides.configuration) }
}

export function describeTrainingTask(task) {
  const config = task.configuration
  if (task.type === 'highscore') return `${config.rounds} Aufnahmen · ${config.rounds * 3} Darts`
  if (task.type === 'checkout') return `${config.targets.length} Checkouts · max. ${config.maxDarts} Darts`
  const darts = getTrainingTaskEventCount(task)
  return `${Math.ceil(darts / (config.dartsPerRound || 3))} Aufnahmen · ${darts} Darts`
}

export function getTrainingTaskEventCount(task) {
  const config = task.configuration
  if (task.type === 'highscore' || task.type === 'checkout') return task.type === 'highscore' ? config.rounds : config.targets.length
  if (config.totalDarts) return config.totalDarts
  if (task.type === 'sequence') return config.targets.length * (config.dartsPerTarget || 1) * (config.repeatRounds || 1)
  return config.rounds * config.dartsPerRound
}

export function getTrainingTaskMaxScore(task) {
  if (!task.scored) return 0
  const config = task.configuration
  if (task.type === 'highscore') return config.rounds * 180
  if (task.type === 'checkout') return config.targets.length * Math.max(...Object.values(config.scoring))
  const maximum = task.type === 'bull' ? config.scoring.bullseye : task.type === 'sequence' && config.ring === 'double' ? config.scoring.double : task.type === 'sequence' && config.ring === 'triple' ? config.scoring.triple : Math.max(...Object.values(config.scoring))
  return getTrainingTaskEventCount(task) * maximum
}

export function getTrainingTarget(task, eventIndex) {
  const config = task.configuration
  if (task.type === 'bull') return 'BULL'
  if (task.type === 'segment') return String(config.target)
  if (task.type === 'checkout') return String(config.targets[eventIndex] ?? config.targets.at(-1))
  if (task.type !== 'sequence') return null
  const span = config.dartsPerTarget || 1
  const index = Math.floor(eventIndex / span) % config.targets.length
  const prefix = config.ring === 'double' ? 'D' : config.ring === 'triple' ? 'T' : config.ring === 'single' ? 'S' : ''
  return `${prefix}${config.targets[index]}`
}
