// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - Asegúrate de instalar el paquete `redis` con `pnpm add redis`
import { createClient } from 'redis'

const redisUrl = process.env.REDIS_URL // format: redis://user:password@host:port

let redisClient: ReturnType<typeof createClient> | null = null

export async function getRedis() {
  if (redisClient) return redisClient

  if (!redisUrl) {
    throw new Error('REDIS_URL no definido en variables de entorno')
  }

  redisClient = createClient({ url: redisUrl })

  redisClient.on('error', (err: unknown) => {
    console.error('Redis Client Error', err)
  })

  await redisClient.connect()
  return redisClient
}

export async function redisGet<T = any>(key: string): Promise<T | null> {
  const client = await getRedis()
  const res = await client.get(key)
  return res ? (JSON.parse(res) as T) : null
}

export async function redisSet<T = any>(key: string, value: T, ttlSeconds = 3 * 60 * 60) { // 3 horas
  const client = await getRedis()
  await client.set(key, JSON.stringify(value), {
    EX: ttlSeconds
  })
}

export async function redisDel(key: string) {
  const client = await getRedis()
  await client.del(key)
} 