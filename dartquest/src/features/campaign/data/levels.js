import { beginnerLevels } from '../difficulty/beginner'
import { easyLevels } from '../difficulty/easy'
import { mediumLevels } from '../difficulty/medium'
import { hardLevels } from '../difficulty/hard'
import { proLevels } from '../difficulty/pro'

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
