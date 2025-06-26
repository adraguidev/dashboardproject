import { NextRequest, NextResponse } from 'next/server'
import { logInfo, logError } from '@/lib/logger'

// Clase para acceder al caché en memoria (mismo que en server-cache.ts)
class MemoryCache {
  private static instance: MemoryCache;
  private cache: Map<string, any> = new Map();
  
  private constructor() {}
  
  public static getInstance(): MemoryCache {
    if (!MemoryCache.instance) {
      MemoryCache.instance = new MemoryCache();
    }
    return MemoryCache.instance;
  }
  
  async flushAll(): Promise<void> {
    this.cache.clear();
  }
}

const memoryCache = MemoryCache.getInstance();

/**
 * Endpoint para limpiar completamente el caché en memoria.
 * Usado por el botón de refresh global en el dashboard.
 */
export async function POST(request: NextRequest) {
  try {
    logInfo('🧹 Iniciando limpieza completa de caché en memoria...')
    
    await memoryCache.flushAll()
    
    logInfo('✅ Caché en memoria limpiado completamente')

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