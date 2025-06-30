import { NextRequest, NextResponse } from 'next/server';
import { createDirectDatabaseAPI } from '@/lib/db';
import { logInfo, logError } from '@/lib/logger';
import { cachedOperation, structureDataForAI, AIOptimizedDashboardData } from '@/lib/server-cache';

// Funciones auxiliares para consolidar datos con nuestra API directa
async function getIngresosData(proceso: string, dbAPI: any) {
  if (proceso === 'CCM') {
    return await dbAPI.getCCMIngresos(30);
  } else if (proceso === 'PRR') {
    return await dbAPI.getPRRIngresos(30);
  }
  return [];
}

async function getProduccionData(proceso: string, dbAPI: any) {
  if (proceso === 'CCM') {
    return await dbAPI.getAllCCMProduccion(30);
  } else if (proceso === 'PRR') {
    return await dbAPI.getAllPRRProduccion(30);
  }
  return [];
}

async function getPendientesData(proceso: string, dbAPI: any) {
  if (proceso === 'CCM') {
    return await dbAPI.getAllCCMPendientes();
  } else if (proceso === 'PRR') {
    return await dbAPI.getAllPRRPendientes();
  }
  return [];
}

async function getEvaluadoresData(dbAPI: any) {
  return await dbAPI.getEvaluadores();
}

async function getKPIsData(dbAPI: any) {
  return await dbAPI.getKPIs();
}

async function getProcessesData(dbAPI: any) {
  return await dbAPI.getProcesos();
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const proceso = searchParams.get('proceso')?.toUpperCase() || 'CCM';

    // 1. VALIDACIÓN DE ENTRADA ESTRICTA
    if (proceso !== 'CCM' && proceso !== 'PRR') {
      logError(`Intento de acceso con proceso no válido: ${proceso}`);
      return NextResponse.json({ error: `Proceso no válido: ${proceso}` }, { status: 400 });
    }

    // 2. Usar el gestor de cache optimizado para IA
    const cacheKey = `dashboard:ai_optimized:${proceso}:v2`;
    const ttl = 6 * 60 * 60; // 6 horas

    const dashboardData = await cachedOperation<AIOptimizedDashboardData>({
      key: cacheKey,
      ttlSeconds: ttl,
      fetcher: async (): Promise<AIOptimizedDashboardData> => {
        logInfo(`🤖 Generando datos optimizados para IA: ${proceso}`);
        
        // Crear instancia de la API directa a PostgreSQL
        const dbAPI = await createDirectDatabaseAPI();

        const [
          ingresosResult, 
          produccionResult, 
          pendientesResult, 
          evaluadoresResult, 
          kpisResult,
          processesResult
        ] = await Promise.allSettled([
          getIngresosData(proceso, dbAPI),
          getProduccionData(proceso, dbAPI),
          getPendientesData(proceso, dbAPI),
          getEvaluadoresData(dbAPI),
          getKPIsData(dbAPI),
          getProcessesData(dbAPI)
        ]);

        // Recopilar errores de las consultas que fallaron
        const errors = [
          ingresosResult.status === 'rejected' ? `ingresos: ${ingresosResult.reason}` : null,
          produccionResult.status === 'rejected' ? `produccion: ${produccionResult.reason}` : null,
          pendientesResult.status === 'rejected' ? `pendientes: ${pendientesResult.reason}` : null,
          evaluadoresResult.status === 'rejected' ? `evaluadores: ${evaluadoresResult.reason}` : null,
          kpisResult.status === 'rejected' ? `kpis: ${kpisResult.reason}` : null,
          processesResult.status === 'rejected' ? `processes: ${processesResult.reason}` : null,
        ].filter(Boolean);

        // Datos brutos para estructurar
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

      // Validador inteligente que verifica calidad de datos
      validator: (data) => {
        if (!data || !data.metadata) return false;
        
        // Verificar que hay datos significativos
        const hasSignificantData = 
          data.ingresos.data.length > 0 || 
          data.produccion.data.length > 0 || 
          data.pendientes.data.length > 0;
          
        // Verificar que no hay errores críticos
        const hasNoErrors = data.metadata.errors.length === 0;
        
        // Datos válidos si hay información útil, aunque tenga algunos errores menores
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