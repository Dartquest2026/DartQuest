export function getBossIntroContent(level, worldName) {
  const world = Number(level?.world) || Math.ceil(Number(level?.id) / 10) || 1
  const rawTitle = String(level?.title ?? '').trim()
  const parsedName = rawTitle.replace(/^Boss\s*[–—-]\s*/i, '').trim()
  const bossName = parsedName && parsedName.toLowerCase() !== 'boss'
    ? parsedName
    : `Boss der Welt ${world}`
  const target = Number.isFinite(level?.targetHits) && level.targetHits > 0
    ? `${level.targetHits} erforderliche Treffer`
    : null

  return {
    levelId: level?.id,
    world,
    worldLabel: worldName || `Welt ${world}`,
    bossName,
    task: String(level?.task ?? '').trim() || 'Schließe die Boss-Aufgabe erfolgreich ab.',
    target,
  }
}
