import { NextRequest, NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { redis } from '@/lib/redis'
import { logInfo, logError, logWarn } from '@/lib/logger'

// Prefijo para los módulos antiguos que usan caché manual en Redis
const LEGACY_CACHE_PREFIX = 'dashboard:*';
const SPE_CACHE_PREFIX = 'spe:*';
// Tag para los módulos nuevos que usan la caché integrada de Next.js
const SPE_CACHE_TAG = 'spe-cache';

/**
 * Endpoint para limpiar la caché global, combinando el método legacy (Redis)
 * y el moderno (Next.js Tags) de forma segura.
 */
export async function POST(request: NextRequest) {
  logInfo(`🧹 Iniciando limpieza de caché GLOBAL (Legacy Redis + Next.js Tags).`);

  const results = {
    legacyKeysDeleted: 0,
    tagRevalidated: false,
    errors: [] as string[],
    warnings: [] as string[],
  };

  // --- 1. Limpiar caché Legacy de Redis (si está habilitado) ---
  if (process.env.UPSTASH_REDIS_URL) {
    try {
      // Borrar dashboard:*
      const stream1 = redis.scanStream({ match: LEGACY_CACHE_PREFIX, count: 100 });
      const pipeline = redis.pipeline();
      let keysFound = 0;
      for await (const keys of stream1) {
        if (keys.length) {
          keysFound += keys.length;
          pipeline.del(...keys);
        }
      }
      // Borrar spe:*
      const stream2 = redis.scanStream({ match: SPE_CACHE_PREFIX, count: 100 });
      let speKeysFound = 0;
      for await (const keys of stream2) {
        if (keys.length) {
          speKeysFound += keys.length;
          pipeline.del(...keys);
        }
      }
      if (keysFound + speKeysFound > 0) {
        await pipeline.exec();
      }
      results.legacyKeysDeleted = keysFound + speKeysFound;
      logInfo(`✅ Caché Legacy de Redis limpiado. ${results.legacyKeysDeleted} claves eliminadas (dashboard:* y spe:*)`);
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : 'Error desconocido en Redis';
      logError('❌ Error limpiando caché Legacy de Redis:', e);
      results.errors.push(`Redis: ${errorMsg}`);
    }
  } else {
    const warningMsg = "Redis no está configurado, omitiendo limpieza de caché legacy.";
    logWarn(warningMsg);
    results.warnings.push(warningMsg);
  }

  // --- 2. Revalidar Tag de la caché de Next.js (para SPE) ---
  try {
    revalidateTag(SPE_CACHE_TAG);
    results.tagRevalidated = true;
    logInfo(`✅ Tag de Next.js '${SPE_CACHE_TAG}' revalidado.`);
  } catch (e) {
    const errorMsg = e instanceof Error ? e.message : 'Error desconocido en revalidateTag';
    logError(`❌ Error revalidando el tag '${SPE_CACHE_TAG}':`, e);
    results.errors.push(`Next.js Cache: ${errorMsg}`);
  }
  
  // --- 3. Enviar respuesta ---
  if (results.errors.length > 0) {
    return NextResponse.json({
      success: false,
      message: "La limpieza de caché finalizó con errores.",
      details: results
    }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    message: 'Caché global limpiado exitosamente.',
    details: results
  });
}

export const runtime = 'nodejs' 