import { NextRequest, NextResponse } from 'next/server';
import { createDirectDatabaseAPI } from '@/lib/db';
import { cachedOperation } from '@/lib/server-cache';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const proceso = (searchParams.get('proceso') as 'ccm' | 'prr') || 'ccm';

    const cacheKey = `dashboard:resueltos_analysis:${proceso}`;
    const ttl = 6 * 60 * 60; // 6 horas

    const analysisData = await cachedOperation({
      key: cacheKey,
      ttlSeconds: ttl,
      fetcher: async () => {
        const dbAPI = await createDirectDatabaseAPI();
        // Llamar al nuevo método del servicio en lugar de ejecutar SQL crudo
        const result = await dbAPI.getResueltosAnalysis(proceso);
        return result;
      },
    });

    return NextResponse.json({ success: true, data: analysisData });

  } catch (error) {
    console.error("Error en la API de análisis de resueltos:", error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor', details: (error as Error).message },
      { status: 500 }
    );
  }
} 