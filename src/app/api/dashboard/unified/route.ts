import { NextRequest, NextResponse } from 'next/server';
import postgresAPI from '@/lib/postgres-api';
import { redisGet, redisSetPersistent } from '@/lib/redis';
import { logInfo, logError } from '@/lib/logger';

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
    const proceso = searchParams.get('proceso') || 'CCM';
    
    // Intentar obtener desde cache primero
    const cacheKey = `dashboard:unified:${proceso}`;
    const cached = await redisGet(cacheKey);
    
    if (cached) {
      logInfo('Datos del dashboard obtenidos desde cache', { proceso });
      return NextResponse.json(cached);
    }

    logInfo('Obteniendo datos frescos del dashboard', { proceso });

    // Ejecutar todas las consultas EN PARALELO - patrón enterprise
    const [
      ingresosData, 
      produccionData, 
      pendientesData, 
      evaluadoresData, 
      kpisData,
      processesData
    ] = await Promise.allSettled([
      getIngresosData(proceso),
      getProduccionData(proceso),
      getPendientesData(proceso),
      getEvaluadoresData(),
      getKPIsData(),
      getProcessesData()
    ]);

    // Procesar resultados y manejar errores individuales
    const dashboardData = {
      // Datos principales
      ingresos: ingresosData.status === 'fulfilled' ? ingresosData.value : { data: [], error: 'Error cargando ingresos' },
      produccion: produccionData.status === 'fulfilled' ? produccionData.value : { data: [], error: 'Error cargando producción' },
      pendientes: pendientesData.status === 'fulfilled' ? pendientesData.value : { data: [], error: 'Error cargando pendientes' },
      evaluadores: evaluadoresData.status === 'fulfilled' ? evaluadoresData.value : { data: [], error: 'Error cargando evaluadores' },
      kpis: kpisData.status === 'fulfilled' ? kpisData.value : { data: [], error: 'Error cargando KPIs' },
      processes: processesData.status === 'fulfilled' ? processesData.value : { data: [], error: 'Error cargando procesos' },
      
      // Metadata
      metadata: {
        proceso,
        timestamp: Date.now(),
        cacheHit: false,
        errors: [
          ingresosData.status === 'rejected' ? `ingresos: ${ingresosData.reason}` : null,
          produccionData.status === 'rejected' ? `produccion: ${produccionData.reason}` : null,
          pendientesData.status === 'rejected' ? `pendientes: ${pendientesData.reason}` : null,
          evaluadoresData.status === 'rejected' ? `evaluadores: ${evaluadoresData.reason}` : null,
          kpisData.status === 'rejected' ? `kpis: ${kpisData.reason}` : null,
          processesData.status === 'rejected' ? `processes: ${processesData.reason}` : null,
        ].filter(Boolean)
      }
    };

    // Cache persistente por proceso - estrategia enterprise
    await redisSetPersistent(cacheKey, dashboardData);
    
    logInfo('Dashboard data cached successfully', { 
      proceso, 
      errors: dashboardData.metadata.errors.length 
    });

    return NextResponse.json(dashboardData);

  } catch (error) {
    logError('Error fatal en dashboard unificado', error);
    
    return NextResponse.json(
      { 
        error: 'Error interno del servidor',
        details: error instanceof Error ? error.message : 'Error desconocido',
        metadata: {
          timestamp: Date.now(),
          cacheHit: false,
          errors: ['Error fatal del sistema']
        }
      },
      { status: 500 }
    );
  }
} 