import { NextRequest, NextResponse } from 'next/server';
import { createDirectDatabaseAPI } from '@/lib/db';
import { logInfo, logError } from '@/lib/logger';
import { cachedOperation, structureDataForAI, AIOptimizedDashboardData } from '@/lib/server-cache';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const proceso = searchParams.get('proceso')?.toUpperCase() || 'CCM';

    if (proceso !== 'CCM' && proceso !== 'PRR') {
      logError(`Intento de acceso con proceso no válido: ${proceso}`);
      return NextResponse.json({ error: `Proceso no válido: ${proceso}` }, { status: 400 });
    }

    const dashboardData = await cachedOperation<AIOptimizedDashboardData>({
      key: `dashboard:ai_optimized:${proceso}:v2_direct`,
      ttlSeconds: 3 * 60 * 60, // 3 horas

      fetcher: async (): Promise<AIOptimizedDashboardData> => {
        logInfo(`🤖 Generando datos optimizados para IA con conexión directa: ${proceso}`);
        
        const dbAPI = await createDirectDatabaseAPI();

        const [
          ingresosResult, 
          produccionResult, 
          pendientesResult, 
          evaluadoresResult, 
          kpisResult,
          processesResult
        ] = await Promise.allSettled([
          proceso === 'CCM' ? dbAPI.getCCMIngresos(30) : dbAPI.getPRRIngresos(30),
          proceso === 'CCM' ? dbAPI.getAllCCMProduccion(30) : dbAPI.getAllPRRProduccion(30),
          proceso === 'CCM' ? dbAPI.getAllCCMPendientes() : dbAPI.getAllPRRPendientes(),
          proceso === 'CCM' ? dbAPI.getEvaluadoresCCM() : dbAPI.getEvaluadoresPRR(),
          dbAPI.getKPIs(),
          dbAPI.getProcesos()
        ]);

        const errors = [
          ingresosResult.status === 'rejected' ? `ingresos: ${ingresosResult.reason}` : null,
          produccionResult.status === 'rejected' ? `produccion: ${produccionResult.reason}` : null,
          pendientesResult.status === 'rejected' ? `pendientes: ${pendientesResult.reason}` : null,
          evaluadoresResult.status === 'rejected' ? `evaluadores: ${evaluadoresResult.reason}` : null,
          kpisResult.status === 'rejected' ? `kpis: ${kpisResult.reason}` : null,
          processesResult.status === 'rejected' ? `processes: ${processesResult.reason}` : null,
        ].filter(Boolean);

        const rawData = {
          ingresos: ingresosResult.status === 'fulfilled' ? ingresosResult.value : [],
          produccion: produccionResult.status === 'fulfilled' ? produccionResult.value : [],
          pendientes: pendientesResult.status === 'fulfilled' ? pendientesResult.value : [],
          evaluadores: evaluadoresResult.status === 'fulfilled' ? evaluadoresResult.value : [],
          kpis: kpisResult.status === 'fulfilled' ? kpisResult.value : {},
          processes: processesResult.status === 'fulfilled' ? processesResult.value : [],
          metadata: { errors }
        };

        // Estructurar datos para análisis por IA
        return structureDataForAI(rawData, proceso as 'CCM' | 'PRR');
      },

      validator: (data) => {
        if (!data || !data.metadata) return false;
        
        const hasSignificantData = 
          (data.ingresos?.data?.length || 0) > 0 || 
          (data.produccion?.data?.length || 0) > 0 || 
          (data.pendientes?.data?.length || 0) > 0;
          
        return hasSignificantData || (data.metadata.errors.length <= 2);
      }
    });

    logInfo(`✅ Dashboard optimizado generado para ${proceso}: ${dashboardData.metadata.summary.totalRegistros} registros totales`);
    
    return NextResponse.json(dashboardData);

  } catch (error) {
    logError('Error fatal en GET /api/dashboard/unified', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 