// Frontend simple cache usando localStorage
const PREFIX = 'ufsm_cache_'
const TTL = 30 * 60 * 1000 // 30 minutos en ms (REDUCIDO de 3 horas)

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
 * Limpiar caché específico por tipo de datos
 */
export function clearCacheByType(type: 'pendientes' | 'ingresos' | 'produccion' | 'all' = 'all') {
  if (typeof window === 'undefined') return false;
  
  const keysToRemove: string[] = [];
  
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key || !key.startsWith(PREFIX)) continue;
    
    const cacheKey = key.replace(PREFIX, '');
    
    if (type === 'all' || cacheKey.includes(type)) {
      keysToRemove.push(key);
    }
  }
  
  keysToRemove.forEach(key => {
    localStorage.removeItem(key);
    console.log(`🗑️ Cache cleared: ${key}`);
  });
  
  console.log(`✅ Cleared ${keysToRemove.length} cache entries for type: ${type}`);
  return keysToRemove.length > 0;
}

/**
 * Obtener estadísticas del caché
 */
export function getCacheStats() {
  if (typeof window === 'undefined') return null;
  
  const cacheEntries = [];
  const now = Date.now();
  
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key || !key.startsWith(PREFIX)) continue;
    
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const entry: CacheEntry<any> = JSON.parse(raw);
        const age = now - entry.ts;
        const isExpired = age > TTL;
        
        cacheEntries.push({
          key: key.replace(PREFIX, ''),
          ageMinutes: Math.round(age / (60 * 1000)),
          isExpired,
          sizeKB: Math.round(raw.length / 1024)
        });
      }
    } catch {}
  }
  
  return {
    totalEntries: cacheEntries.length,
    totalSizeKB: cacheEntries.reduce((sum, entry) => sum + entry.sizeKB, 0),
    expiredEntries: cacheEntries.filter(e => e.isExpired).length,
    entries: cacheEntries
  };
}

/**
 * Función de diagnóstico para debugging - disponible globalmente en desarrollo
 */
export function debugCache() {
  if (typeof window === 'undefined') return;
  
  const stats = getCacheStats();
  console.group('🔍 DIAGNÓSTICO DE CACHÉ');
  console.log('📊 Estadísticas:', stats);
  
  if (stats && stats.entries.length > 0) {
    console.table(stats.entries);
    
    if (stats.expiredEntries > 0) {
      console.warn(`⚠️ ${stats.expiredEntries} entradas expiradas encontradas`);
    }
    
    // Mostrar información útil
    console.log('🔧 Para limpiar caché manualmente:');
    console.log('   - Todo: clearAllCache()');
    console.log('   - Por tipo: clearCacheByType("pendientes"|"ingresos"|"produccion")');
    console.log('   - Ver stats: getCacheStats()');
  } else {
    console.log('✅ No hay entradas de caché');
  }
  
  console.groupEnd();
  
  return stats;
}

// En desarrollo, hacer funciones disponibles globalmente
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).debugCache = debugCache;
  (window as any).clearAllCache = clearAllCache;
  (window as any).clearCacheByType = clearCacheByType;
  (window as any).getCacheStats = getCacheStats;
} 