import Redis, { RedisOptions } from 'ioredis';

let redis: Redis;

// Opciones de configuración para hacer la conexión más resiliente
const redisOptions: RedisOptions = {
  connectTimeout: 10000, // 10 segundos de tiempo de espera para la conexión
  maxRetriesPerRequest: 3, // Reintentar un máximo de 3 veces si un comando falla
  enableReadyCheck: false, // Optimización para entornos serverless
  showFriendlyErrorStack: true, // Errores más legibles en los logs
};

// Documentación de Variables de Entorno para Redis (Upstash)
//
// Para que el sistema de monitoreo de progreso funcione, necesitas una base de datos de Redis.
// Recomendamos usar Upstash, que ofrece un plan gratuito generoso.
//
// 1. Ve a https://upstash.com/ y crea una cuenta.
// 2. Crea una nueva base de datos de Redis.
// 3. Copia el string de conexión (Connection String) y añádelo a tu archivo .env.local:
//
// UPSTASH_REDIS_URL="rediss://default:..."

if (process.env.UPSTASH_REDIS_URL) {
  // Aplicar las opciones de configuración al crear la instancia
  redis = new Redis(process.env.UPSTASH_REDIS_URL, redisOptions);
  
  redis.on('error', (err) => {
    console.error('[Redis] Error de conexión:', err);
  });

  redis.on('connect', () => {
    console.log('✅ Conexión a Redis (Upstash) establecida.');
  });

} else {
  console.warn('⚠️  La variable de entorno UPSTASH_REDIS_URL no está configurada. El monitoreo de progreso no funcionará.');
  // Fallback a un mock si no hay credenciales para evitar que la app crashee
  redis = {
    get: async () => null,
    setex: async () => 'OK',
    on: () => {},
  } as any;
}

export { redis };

export const jobStatusManager = {
  async update(jobId: string, data: Record<string, any>) {
    try {
      // Guardar el estado por 1 hora
      await redis.setex(`job:${jobId}`, 3600, JSON.stringify(data));
    } catch (error) {
      console.error(`[Redis] Error actualizando el estado para el trabajo ${jobId}:`, error);
    }
  },

  async get(jobId: string) {
    try {
      const data = await redis.get(`job:${jobId}`);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error(`[Redis] Error obteniendo el estado para el trabajo ${jobId}:`, error);
      return null;
    }
  }
}; 