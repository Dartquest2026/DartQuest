// Device history is separate from account data; unfinished runs stay in memory.
const values = new Map()
let active = false
const memory = { getItem: key => values.get(key) ?? null, setItem: (key,value) => values.set(key,String(value)), removeItem: key => values.delete(key) }
export function beginFreeTraining() { values.clear(); active = true }
export function endFreeTraining() { values.clear(); active = false }
const deviceKey = key => 'dartquest-free-board-' + key
const isHistory = key => key.endsWith('-history') || key.startsWith('dartquest-training-reset-markers-')
const boardStorage = {
  getItem: key => isHistory(key) ? localStorage.getItem(deviceKey(key)) : memory.getItem(key),
  setItem: (key,value) => isHistory(key) ? localStorage.setItem(deviceKey(key),value) : memory.setItem(key,value),
  removeItem: key => isHistory(key) ? localStorage.removeItem(deviceKey(key)) : memory.removeItem(key),
}
export function trainingStorage() { return active ? boardStorage : localStorage }
export function acceptsTrainingCode(code) { return code === '1910' }

export function normalizeTrainingName(value) { return String(value ?? '').trim().replace(/\s+/g,' ').slice(0,40) }
