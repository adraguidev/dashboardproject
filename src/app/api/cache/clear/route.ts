import { NextRequest, NextResponse } from 'next/server'
import { redisFlushAll } from '@/lib/redis'
import { logInfo, logError } from '@/lib/logger'

/**
 * Endpoint para limpiar completamente el cache de Redis.
 * Usado por el botón de refresh global en el dashboard.
 */
export async function POST(request: NextRequest) {
  try {
    logInfo('🧹 Iniciando limpieza completa de cache...')
    
    await redisFlushAll()
    
    logInfo('✅ Cache limpiado completamente')

    return NextResponse.json({ 
      success: true, 
      message: 'Cache limpiado exitosamente',
      type: 'full'
    })

  } catch (error) {
    logError('❌ Error limpiando cache:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Error interno del servidor al limpiar cache',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    )
  }
}

export const runtime = 'nodejs' 