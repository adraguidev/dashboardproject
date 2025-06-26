import { redisGet, redisSet } from '@/lib/redis';
import { logInfo, logWarn } from '@/lib/logger';

interface CacheOptions<T> {
  /** Clave única para esta operación de cache. */
  key: string;
  /** Función asíncrona que obtiene los datos frescos si no están en cache. */
  fetcher: () => Promise<T>;
  /** Tiempo de vida del cache en segundos. Por defecto 3 horas. */
  ttlSeconds?: number;
  /** Función para validar si los datos frescos deben ser cacheados. */
  validator?: (data: T) => boolean;
}

/**
 * Validador por defecto.
 * - Rechaza: null, undefined.
 * - Para arrays, rechaza si están vacíos.
 * - Acepta objetos vacíos y otros valores.
 */
const defaultValidator = (data: any): boolean => {
  if (data === null || data === undefined) {
    return false;
  }
  if (Array.isArray(data) && data.length === 0) {
    return false;
  }
  return true;
};

/**
 * Gestor de operaciones cacheadas en Redis para el lado del servidor.
 * Encapsula la lógica de obtener, validar y guardar en cache.
 *
 * @param options Opciones de configuración para la operación de cache.
 * @returns Los datos, ya sean de cache o frescos.
 */
export async function cachedOperation<T>({
  key,
  fetcher,
  ttlSeconds = 3 * 60 * 60, // 3 horas
  validator = defaultValidator,
}: CacheOptions<T>): Promise<T> {
  // 1. Intentar obtener desde cache
  try {
    const cachedData = await redisGet<T>(key);
    if (cachedData !== null) {
      logInfo(`[Cache HIT] Obteniendo desde cache: ${key}`);
      return cachedData;
    }
  } catch (error) {
    logWarn(`[Cache ERROR] No se pudo leer de Redis, se obtendrán datos frescos. Clave: ${key}`, error);
  }

  // 2. Si no está en cache, obtener datos frescos
  logInfo(`[Cache MISS] Obteniendo datos frescos para: ${key}`);
  const freshData = await fetcher();

  // 3. Validar los datos antes de cachear
  if (validator(freshData)) {
    logInfo(`[Cache SET] Datos válidos, guardando en cache: ${key} (TTL: ${ttlSeconds}s)`);
    // No esperamos a que termine para no retrasar la respuesta
    redisSet(key, freshData, ttlSeconds).catch(err => {
      logWarn(`[Cache SET FAILED] Error al guardar en Redis en segundo plano. Clave: ${key}`, err);
    });
  } else {
    logWarn(`[Cache SKIP] Datos no válidos o vacíos, no se guardarán en cache: ${key}`);
  }

  return freshData;
} 