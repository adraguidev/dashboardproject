import { NextRequest, NextResponse } from 'next/server'
import { redis } from '@/lib/redis'; // Importar la instancia de Redis
import { logInfo, logError } from '@/lib/logger'

const CACHE_PREFIX = 'dashboard:*'; // Prefijo para las claves de caché del dashboard

/**
 * Endpoint para limpiar completamente el caché del dashboard en Redis.
 */
export async function POST(request: NextRequest) {
  try {
    logInfo(`🧹 Iniciando limpieza de caché en Redis (patrón: ${CACHE_PREFIX})`);
    
    const stream = redis.scanStream({
      match: CACHE_PREFIX,
      count: 100,
    });

    let keysFound = 0;
    const pipeline = redis.pipeline();

    for await (const keys of stream) {
      if (keys.length) {
        keysFound += keys.length;
        pipeline.del(...keys);
      }
    }

    if (keysFound > 0) {
      await pipeline.exec();
    }
    
    logInfo(`✅ Caché de Redis limpiado. ${keysFound} claves eliminadas.`);

    return NextResponse.json({ 
      success: true, 
      message: 'Cache de Redis limpiado exitosamente',
      keysDeleted: keysFound
    });

  } catch (error) {
    logError('❌ Error limpiando cache de Redis:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Error interno del servidor al limpiar cache de Redis',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}

export const runtime = 'nodejs' 