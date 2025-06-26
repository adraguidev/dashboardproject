import { NextResponse } from 'next/server'
import postgresAPI from '@/lib/postgres-api'
import { logInfo, logError } from '@/lib/logger'

export async function GET() {
  try {
    logInfo('🔍 Verificando estado de la base de datos PostgreSQL...')
    
    // Realizar health check completo
    const healthCheck = await postgresAPI.healthCheck()
    
    logInfo('✅ Health check completado:', healthCheck)
    
    return NextResponse.json({
      status: healthCheck.status,
      message: healthCheck.status === 'healthy' 
        ? 'Base de datos PostgreSQL funcionando correctamente' 
        : 'Problemas detectados en la base de datos',
      details: {
        database: healthCheck.database,
        responseTime: `${healthCheck.responseTime}ms`,
        timestamp: healthCheck.timestamp,
        poolStats: healthCheck.poolStats,
        tablesCounts: healthCheck.tablesCounts
      },
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    logError('❌ Error verificando estado de la base de datos:', error)
    
    return NextResponse.json(
      {
        status: 'error',
        message: 'Error verificando la base de datos',
        error: error instanceof Error ? error.message : 'Error desconocido',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
} 
 
 