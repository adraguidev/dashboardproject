import Redis from 'ioredis';

let redis: Redis;

// Documentación de Variables de Entorno para Redis (Upstash)
//
// Para que el sistema de monitoreo de progreso funcione, necesitas una base de datos de Redis.
// Recomendamos usar Upstash, que ofrece un plan gratuito generoso.
//
// 1. Ve a https://upstash.com/ y crea una cuenta.
// 2. Crea una nueva base de datos de Redis.
// 3. Copia las credenciales y añádelas a tu archivo .env.local:
//
// UPSTASH_REDIS_REST_URL="https://eu1-active-dassie-12345.upstash.io"
// UPSTASH_REDIS_REST_TOKEN="..."

if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  redis = new Redis(process.env.UPSTASH_REDIS_REST_URL, {
    password: process.env.UPSTASH_REDIS_REST_TOKEN,
  });
  console.log('✅ Conexión a Redis (Upstash) establecida.');
} else {
  console.warn('⚠️  Las variables de entorno de Redis no están configuradas. El monitoreo de progreso no funcionará.');
  // Fallback a un mock si no hay credenciales para evitar que la app crashee
  redis = {
    get: async () => null,
    setex: async () => 'OK',
    on: () => {},
  } as any;
}

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

redis.on('error', (err) => {
  console.error('[Redis] Error de conexión:', err);
}); 