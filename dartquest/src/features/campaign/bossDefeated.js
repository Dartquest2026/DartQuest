export function shouldShowBossDefeated({ level, result, confirmation }) {
  return level?.boss === true
    && result?.success !== false
    && Number(result?.stars) >= 1
    && confirmation?.saved === true
    && Number.isFinite(confirmation.awardedXP)
    && Number.isFinite(confirmation.awardedCoins)
}

export function getBossUnlockMessage(confirmation) {
  if (confirmation.campaignCompleted) return 'Kampagne abgeschlossen'
  if (!confirmation.newlyUnlocked) return ''
  if (confirmation.newWorldName) return `Neue Welt freigeschaltet: ${confirmation.newWorldName}`
  return confirmation.nextLevelId ? `Nächstes Level freigeschaltet: Level ${confirmation.nextLevelId}` : ''
}
