import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: ['query', 'error', 'warn'],
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
})

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

// Función mejorada para verificar conexión a la BD con reintentos
export async function checkDatabaseConnection(retries = 2): Promise<boolean> {
  for (let attempt = 1; attempt <= retries + 1; attempt++) {
    try {
      console.log(`🔌 Intento de conexión ${attempt}/${retries + 1} a Neon PostgreSQL...`)
      
      // Conectar con timeout personalizado
      await prisma.$connect()
      
      // Query simple para verificar que la BD está realmente disponible
      await prisma.$queryRaw`SELECT 1 as test`
      
      console.log('✅ Conexión exitosa a Neon PostgreSQL')
      return true
      
    } catch (error: any) {
      const isLastAttempt = attempt === retries + 1
      
      if (error.code === 'P1001') {
        console.warn(`⏱️  Timeout en intento ${attempt}: Neon compute probablemente en estado idle`)
        if (!isLastAttempt) {
          console.log(`🔄 Reintentando en 3 segundos... (la BD puede estar activándose)`)
          await new Promise(resolve => setTimeout(resolve, 3000))
          continue
        }
      }
      
      if (isLastAttempt) {
        console.error('❌ Error final de conexión a BD:', {
          code: error.code,
          message: error.message,
          details: 'La base de datos Neon puede estar en estado idle o hay problemas de red'
        })
      }
    }
  }
  
  return false
}

// Función para desconectar de la BD
export async function disconnectDatabase(): Promise<void> {
  try {
    await prisma.$disconnect()
    console.log('🔌 Desconectado de la base de datos')
  } catch (error) {
    console.warn('⚠️  Error al desconectar de la base de datos:', error)
  }
}

// Función para "despertar" la base de datos Neon con múltiples intentos
export async function wakeUpNeonDatabase(): Promise<boolean> {
  console.log('🌅 Intentando despertar la base de datos Neon...')
  
  // Intentar hasta 3 veces con delays incrementales
  const attempts = [5000, 8000, 12000] // 5s, 8s, 12s
  
  for (let i = 0; i < attempts.length; i++) {
    console.log(`⏳ Intento ${i + 1}/3 - Esperando ${attempts[i]/1000}s para activación...`)
    
    const isConnected = await checkDatabaseConnection(0) // Sin reintentos internos
    if (isConnected) {
      console.log('✅ Base de datos Neon activada correctamente')
      return true
    }
    
    if (i < attempts.length - 1) {
      await new Promise(resolve => setTimeout(resolve, attempts[i]))
    }
  }
  
  console.log('💤 La base de datos Neon no pudo ser activada')
  return false
} 
 
 