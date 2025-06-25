// Frontend simple cache usando localStorage
const PREFIX = 'ufsm_cache_'
const TTL = 3 * 60 * 60 * 1000 // 3 horas en ms

interface CacheEntry<T> {
  ts: number
  data: T
}

export function getCached<T>(key: string): T | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(PREFIX + key)
    if (!raw) return null
    const entry: CacheEntry<T> = JSON.parse(raw)
    if (Date.now() - entry.ts > TTL) {
      localStorage.removeItem(PREFIX + key)
      return null
    }
    return entry.data
  } catch {
    return null
  }
}

export function setCached<T>(key: string, data: T) {
  if (typeof window === 'undefined') return
  const entry: CacheEntry<T> = { ts: Date.now(), data }
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(entry))
  } catch {}
}

export function clearAllCache() {
  if (typeof window === 'undefined') return
  Object.keys(localStorage)
    .filter(key => key.startsWith(PREFIX))
    .forEach(key => localStorage.removeItem(key))
} 