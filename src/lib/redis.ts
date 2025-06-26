import { Redis } from '@upstash/redis'

// Configuración de Upstash Redis usando variables de entorno
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

// Verificar que las variables de entorno estén configuradas
if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
  throw new Error('Variables de entorno UPSTASH_REDIS_REST_URL y UPSTASH_REDIS_REST_TOKEN son requeridas')
}

// Función para obtener el cliente Redis (mantenemos compatibilidad)
export async function getRedis() {
  return redis
}

// Función para obtener datos del cache
export async function redisGet<T = any>(key: string): Promise<T | null> {
  try {
    const result = await redis.get(key)
    if (result === null || result === undefined) {
      return null
    }
    
    // Si el resultado ya es un objeto, lo devolvemos directamente
    // Upstash Redis maneja automáticamente la serialización/deserialización
    return result as T
  } catch (error) {
    console.error('Error obteniendo datos de Redis:', error)
    return null
  }
}

// Función para guardar datos en el cache
export async function redisSet<T = any>(key: string, value: T, ttlSeconds = 3 * 60 * 60) { // 3 horas
  try {
    // Upstash Redis maneja automáticamente la serialización
    await redis.set(key, value, { ex: ttlSeconds })
    // Data cached successfully
  } catch (error) {
    console.error('Error guardando datos en Redis:', error)
    throw error
  }
}

// Función para guardar datos en cache persistente (sin TTL)
export async function redisSetPersistent<T = any>(key: string, value: T) {
  try {
    // Guardar sin TTL - persiste hasta limpieza manual
    await redis.set(key, value)
    console.log(`💾 Datos guardados en cache persistente: ${key}`)
  } catch (error) {
    console.error('Error guardando datos persistentes en Redis:', error)
    throw error
  }
}

// Función para eliminar datos del cache
export async function redisDel(key: string) {
  try {
    await redis.del(key)
    console.log(`🗑️ Datos eliminados del cache: ${key}`)
  } catch (error) {
    console.error('Error eliminando datos de Redis:', error)
    throw error
  }
}

// Función para limpiar todo el cache (útil para desarrollo)
export async function redisFlushAll() {
  try {
    await redis.flushall()
    console.log('🧹 Cache completamente limpiado')
  } catch (error) {
    console.error('Error limpiando el cache:', error)
    throw error
  }
}

// Función de prueba para verificar conectividad
export async function testRedisConnection() {
  try {
    await redis.set('test-connection', 'ok')
    const result = await redis.get('test-connection')
    await redis.del('test-connection')
    
    if (result === 'ok') {
      // Upstash Redis connection successful
      return true
    } else {
      console.error('❌ Error en la conexión a Redis')
      return false
    }
  } catch (error) {
    console.error('❌ Error conectando a Upstash Redis:', error)
    return false
  }
} 