import { beginnerLevels } from '../difficulty/beginner.js'
import { easyLevels } from '../difficulty/easy.js'
import { mediumLevels } from '../difficulty/medium.js'
import { hardLevels } from '../difficulty/hard.js'
import { proLevels } from '../difficulty/pro.js'
import { classifyCampaignLevels } from '../campaignTaskTypes.js'

export const difficultyLevels = {
  1: classifyCampaignLevels(beginnerLevels),
  2: classifyCampaignLevels(easyLevels),
  3: classifyCampaignLevels(mediumLevels),
  4: classifyCampaignLevels(hardLevels),
  5: classifyCampaignLevels(proLevels),
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
