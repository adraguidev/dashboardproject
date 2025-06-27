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

/**
 * Limpiar caché específico de pendientes (debug)
 */
export function clearPendientesCache() {
  if (typeof window === 'undefined') return false;
  
  const cacheKeys = ['pendientes_ccm_year', 'pendientes_prr_year', 'pendientes_ccm_quarter', 'pendientes_prr_quarter', 'pendientes_ccm_month', 'pendientes_prr_month'];
  
  cacheKeys.forEach(key => {
    try {
      localStorage.removeItem(`cache_${key}`);
      localStorage.removeItem(`cache_timestamp_${key}`);
      console.log(`🗑️ Cache cleared for key: ${key}`);
    } catch (error) {
      console.warn(`Failed to clear cache for key: ${key}`, error);
    }
  });
  
  return true;
} 