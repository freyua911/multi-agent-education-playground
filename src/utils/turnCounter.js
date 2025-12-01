let turnCount = 0

const STORAGE_KEY = 'stoa_turn_count'

const loadInitial = () => {
  if (typeof window === 'undefined') return 0
  try {
    const value = window.localStorage.getItem(STORAGE_KEY)
    const parsed = Number(value)
    if (Number.isFinite(parsed) && parsed >= 0) {
      return parsed
    }
  } catch {}
  return 0
}

const persist = () => {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, String(turnCount))
  } catch {}
}

turnCount = loadInitial()

export const getTurnCount = () => turnCount

export const incrementTurnCount = () => {
  turnCount += 1
  persist()
  return turnCount
}

export const resetTurnCount = () => {
  turnCount = 0
  persist()
}

