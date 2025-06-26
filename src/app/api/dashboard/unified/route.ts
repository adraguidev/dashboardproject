import { NextRequest, NextResponse } from 'next/server';
import postgresAPI from '@/lib/postgres-api';
import { logInfo, logError } from '@/lib/logger';
import { cachedOperation } from '@/lib/server-cache';

// Funciones auxiliares para consolidar datos con PostgreSQL directo
async function getIngresosData(proceso: string) {
  if (proceso === 'CCM') {
    return await postgresAPI.getCCMIngresos(30);
  } else if (proceso === 'PRR') {
    return await postgresAPI.getPRRIngresos(30);
  }
  return [];
}

async function getProduccionData(proceso: string) {
  return await postgresAPI.getProduccionData(proceso, 30);
}

async function getPendientesData(proceso: string) {
  return await postgresAPI.getPendientes(proceso);
}

async function getEvaluadoresData() {
  return await postgresAPI.getEvaluadores();
}

async function getKPIsData() {
  return await postgresAPI.getKPIs();
}

async function getProcessesData() {
  return await postgresAPI.getProcesos();
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

    // 2. Usar el gestor de cache para toda la operación
    const dashboardData = await cachedOperation({
      key: `dashboard:unified:${proceso}`,
      ttlSeconds: 3 * 60 * 60, // 3 horas

      // Función que obtiene todos los datos si no están en cache
      fetcher: async () => {
        logInfo(`Ejecutando fetcher para dashboard unificado: ${proceso}`);
        const [
          ingresosResult, 
          produccionResult, 
          pendientesResult, 
          evaluadoresResult, 
          kpisResult,
          processesResult
        ] = await Promise.allSettled([
          getIngresosData(proceso),
          getProduccionData(proceso),
          getPendientesData(proceso),
          getEvaluadoresData(),
          getKPIsData(),
          getProcessesData()
        ]);

        const errors = [
          ingresosResult.status === 'rejected' ? `ingresos: ${ingresosResult.reason}` : null,
          produccionResult.status === 'rejected' ? `produccion: ${produccionResult.reason}` : null,
          pendientesResult.status === 'rejected' ? `pendientes: ${pendientesResult.reason}` : null,
          evaluadoresResult.status === 'rejected' ? `evaluadores: ${evaluadoresResult.reason}` : null,
          kpisResult.status === 'rejected' ? `kpis: ${kpisResult.reason}` : null,
          processesResult.status === 'rejected' ? `processes: ${processesResult.reason}` : null,
        ].filter(Boolean);

        return {
          ingresos: ingresosResult.status === 'fulfilled' ? ingresosResult.value : [],
          produccion: produccionResult.status === 'fulfilled' ? produccionResult.value : [],
          pendientes: pendientesResult.status === 'fulfilled' ? pendientesResult.value : [],
          evaluadores: evaluadoresResult.status === 'fulfilled' ? evaluadoresResult.value : [],
          kpis: kpisResult.status === 'fulfilled' ? kpisResult.value : {},
          processes: processesResult.status === 'fulfilled' ? processesResult.value : [],
          metadata: {
            proceso,
            timestamp: Date.now(),
            cacheHit: false, // Será cache hit en la próxima, no en esta
            errors
          }
        };
      },

      // Validador personalizado para los datos del dashboard
      validator: (data) => {
        if (!data) return false;
        const hasErrors = data.metadata.errors.length > 0;
        const hasData = 
          data.ingresos.length > 0 || 
          data.produccion.length > 0 ||
          data.pendientes.length > 0;
        
        return !hasErrors && hasData;
      }
    });
    
    return NextResponse.json(dashboardData);

  } catch (error) {
    logError('Error fatal en GET /api/dashboard/unified', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 