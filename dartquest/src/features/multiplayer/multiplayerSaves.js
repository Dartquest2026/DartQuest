export const MULTIPLAYER_SAVES_STORAGE_KEY =
  'dartquest-multiplayer-saves'

export const MAX_MULTIPLAYER_SAVES = 3

function emptySlots() {
  return Array(MAX_MULTIPLAYER_SAVES).fill(null)
}

export function getMultiplayerSaves() {
  try {
    const savedData = localStorage.getItem(
      MULTIPLAYER_SAVES_STORAGE_KEY,
    )

    if (!savedData) {
      return emptySlots()
    }

    const parsedData = JSON.parse(savedData)
    const storedSlots = Array.isArray(parsedData)
      ? parsedData
      : parsedData?.slots

    if (!Array.isArray(storedSlots)) {
      return emptySlots()
    }

    return emptySlots().map(
      (_, index) => storedSlots[index] ?? null,
    )
  } catch {
    return emptySlots()
  }
}

export function saveMultiplayerGame(
  slotIndex,
  data,
) {
  if (
    slotIndex < 0 ||
    slotIndex >= MAX_MULTIPLAYER_SAVES
  ) {
    return false
  }

  const slots = getMultiplayerSaves()

  slots[slotIndex] = {
    ...data,
    id: slotIndex + 1,
  }

  localStorage.setItem(
    MULTIPLAYER_SAVES_STORAGE_KEY,
    JSON.stringify({ slots }),
  )

  return true
}

export function deleteMultiplayerSave(slotIndex) {
  if (
    slotIndex < 0 ||
    slotIndex >= MAX_MULTIPLAYER_SAVES
  ) {
    return false
  }

  const slots = getMultiplayerSaves()
  slots[slotIndex] = null

  localStorage.setItem(
    MULTIPLAYER_SAVES_STORAGE_KEY,
    JSON.stringify({ slots }),
  )

  return true
}
