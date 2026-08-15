import { beginnerLevels } from '../difficulty/beginner.js'
import { easyLevels } from '../difficulty/easy.js'
import { mediumLevels } from '../difficulty/medium.js'
import { hardLevels } from '../difficulty/hard.js'
import { proLevels } from '../difficulty/pro.js'

export const difficultyLevels = {
  1: beginnerLevels,
  2: easyLevels,
  3: mediumLevels,
  4: hardLevels,
  5: proLevels,
}

export function getLevelsByDifficulty(
  difficulty = 1,
) {
  return (
    difficultyLevels[difficulty] ??
    beginnerLevels
  )
}

/*
  Standardmäßig weiterhin Anfänger.
  Dadurch funktioniert die bisherige
  Einzelspieler-Kampagne erstmal weiter.
*/
export const levels =
  getLevelsByDifficulty(1)
