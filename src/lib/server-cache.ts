import { redisGet, redisSet } from '@/lib/redis';
import { logInfo, logWarn } from '@/lib/logger';

interface CacheOptions<T> {
  /** Clave única para esta operación de cache. */
  key: string;
  /** Función asíncrona que obtiene los datos frescos si no están en cache. */
  fetcher: () => Promise<T>;
  /** Tiempo de vida del cache en segundos. Por defecto 3 horas. */
  ttlSeconds?: number;
  /** Función para validar si los datos frescos deben ser cacheados. */
  validator?: (data: T) => boolean;
}

/**
 * Estructura optimizada para análisis por IA
 */
interface AIOptimizedDashboardData {
  // Metadatos del dashboard para contexto de IA
  metadata: {
    proceso: 'CCM' | 'PRR';
    generatedAt: string; // ISO timestamp
    dataRanges: {
      ingresos: { desde: string; hasta: string; totalDias: number };
      produccion: { desde: string; hasta: string; totalDias: number };
      pendientes: { fechaCorte: string };
    };
    summary: {
      totalRegistros: number;
      distribucion: { ingresos: number; produccion: number; pendientes: number };
      estadisticas: {
        ingresosPromedioDiario: number;
        produccionPromedioDiaria: number;
        tasaPendientes: number; // % de casos pendientes vs total
      };
    };
    errors: string[];
  };

  // Datos de ingresos estructurados por fechas
  ingresos: {
    description: "Expedientes que ingresan al sistema por fecha";
    unit: "expedientes por día";
    structure: "fecha -> cantidad";
    data: Array<{
      fecha: string; // YYYY-MM-DD format
      total_ingresos: number;
      completados: number;
      otros_estados: number;
      dia_semana: string; // "Lunes", "Martes", etc.
      es_laborable: boolean;
    }>;
    aggregated: {
      total_periodo: number;
      promedio_diario: number;
      dias_con_datos: number;
      mejor_dia: { fecha: string; cantidad: number };
      peor_dia: { fecha: string; cantidad: number };
    };
  };

  // Datos de producción estructurados por evaluador y fecha
  produccion: {
    description: "Casos procesados por evaluadores por fecha";
    unit: "casos procesados";
    structure: "evaluador -> fecha -> cantidad";
    data: Array<{
      fecha_produccion: string; // YYYY-MM-DD
      evaluador: string;
      casos_procesados: number;
      dia_semana: string;
      es_laborable: boolean;
    }>;
    aggregated: {
      total_casos: number;
      evaluadores_unicos: number;
      promedio_por_evaluador: number;
      mejor_evaluador: { nombre: string; casos: number };
      distribucion_por_dia: Array<{ dia: string; casos: number }>;
    };
  };

  // Datos de pendientes estructurados por criticidad
  pendientes: {
    description: "Expedientes pendientes de procesamiento";
    unit: "expedientes pendientes";
    structure: "pendientes ordenados por antigüedad";
    data: Array<{
      numerotramite: string;
      fechaexpendiente: string; // YYYY-MM-DD
      estadotramite: string;
      ultimaetapa: string;
      operador: string | null;
      dias_pendiente: number; // calculado desde fechaexpendiente
      criticidad: 'CRITICA' | 'ALTA' | 'MEDIA' | 'BAJA'; // basado en días pendiente
    }>;
    aggregated: {
      total_pendientes: number;
      antiguedad_promedio: number; // días
      distribucion_criticidad: {
        critica: number; // > 90 días
        alta: number;    // 60-90 días
        media: number;   // 30-60 días
        baja: number;    // < 30 días
      };
      evaluadores_con_pendientes: Array<{ evaluador: string; cantidad: number }>;
    };
  };

  // KPIs calculados para resumen ejecutivo
  kpis: {
    description: "Indicadores clave de desempeño";
    data: {
      totalCasosCCM: number;
      totalCasosPRR: number;
      pendientesCCM: number;
      pendientesPRR: number;
      evaluadoresActivos: number;
      eficiencia: {
        tasaAprobacion: number; // % casos aprobados vs total
        velocidadPromedio: number; // días promedio de procesamiento
        cargaPromedioPorEvaluador: number;
      };
    };
  };

  // Lista de evaluadores con sus estadísticas
  evaluadores: {
    description: "Evaluadores activos y sus métricas de desempeño";
    data: Array<{
      nombre: string;
      casos_total: number;
      casos_completados: number;
      casos_pendientes: number;
      tasa_eficiencia: number; // casos_completados / casos_total
      ultima_actividad: string | null; // fecha de último caso procesado
    }>;
  };

  // Información de procesos disponibles
  processes: {
    description: "Procesos de negocio disponibles en el sistema";
    data: string[]; // ['CCM', 'PRR']
  };
}

/**
 * Validador inteligente que verifica la calidad de los datos
 */
const smartValidator = (data: AIOptimizedDashboardData): boolean => {
  if (!data || !data.metadata) return false;
  
  // Verificar que hay datos significativos
  const hasSignificantData = 
    data.ingresos.data.length > 0 || 
    data.produccion.data.length > 0 || 
    data.pendientes.data.length > 0;
    
  // Verificar que no hay errores críticos
  const hasNoErrors = data.metadata.errors.length === 0;
  
  // Verificar consistencia de datos
  const isConsistent = 
    data.metadata.summary.totalRegistros === 
    (data.ingresos.data.length + data.produccion.data.length + data.pendientes.data.length);
  
  return hasSignificantData && hasNoErrors && isConsistent;
};

/**
 * Validador por defecto para retrocompatibilidad
 */
const defaultValidator = (data: any): boolean => {
  if (data === null || data === undefined) {
    return false;
  }
  if (Array.isArray(data) && data.length === 0) {
    return false;
  }
  return true;
};

/**
 * Gestor de operaciones cacheadas en Redis para el lado del servidor.
 * Versión optimizada para análisis por IA con estructura semántica.
 */
export async function cachedOperation<T>({
  key,
  fetcher,
  ttlSeconds = 3 * 60 * 60, // 3 horas
  validator = defaultValidator,
}: CacheOptions<T>): Promise<T> {
  // 1. Intentar obtener desde cache
  try {
    const cachedData = await redisGet<T>(key);
    if (cachedData !== null) {
      logInfo(`[Cache HIT] 📦 Datos obtenidos desde Redis: ${key}`);
      return cachedData;
    }
  } catch (error) {
    logWarn(`[Cache ERROR] ❌ No se pudo leer de Redis: ${key}`, error);
  }

  // 2. Si no está en cache, obtener datos frescos
  logInfo(`[Cache MISS] 🔄 Generando datos frescos para: ${key}`);
  const freshData = await fetcher();

  // 3. Validar los datos antes de cachear
  if (validator(freshData)) {
    logInfo(`[Cache SET] ✅ Guardando datos válidos en Redis: ${key} (TTL: ${ttlSeconds}s)`);
    // Guardar en segundo plano para no retrasar la respuesta
    redisSet(key, freshData, ttlSeconds).catch(err => {
      logWarn(`[Cache SET FAILED] ❌ Error al guardar en Redis: ${key}`, err);
    });
  } else {
    logWarn(`[Cache SKIP] ⚠️ Datos inválidos, no se cachearán: ${key}`);
  }

  return freshData;
}

/**
 * Función auxiliar para estructurar datos de dashboard de forma optimizada para IA
 */
export function structureDataForAI(rawData: any, proceso: 'CCM' | 'PRR'): AIOptimizedDashboardData {
  const now = new Date();
  const fechaCorte = now.toISOString().split('T')[0];
  
  // Calcular metadatos y rangos
  const metadata = {
    proceso,
    generatedAt: now.toISOString(),
    dataRanges: {
      ingresos: calculateDateRange(rawData.ingresos),
      produccion: calculateDateRange(rawData.produccion),
      pendientes: { fechaCorte }
    },
    summary: calculateSummary(rawData),
    errors: rawData.metadata?.errors || []
  };

  return {
    metadata,
    ingresos: structureIngresosData(rawData.ingresos || []),
    produccion: structureProduccionData(rawData.produccion || []),
    pendientes: structurePendientesData(rawData.pendientes || []),
    kpis: structureKPIsData(rawData.kpis || {}),
    evaluadores: structureEvaluadoresData(rawData.evaluadores || []),
    processes: {
      description: "Procesos de negocio disponibles en el sistema",
      data: rawData.processes || ['CCM', 'PRR']
    }
  };
}

// Funciones auxiliares para estructurar cada tipo de datos
function calculateDateRange(data: any[]): { desde: string; hasta: string; totalDias: number } {
  if (!data || data.length === 0) {
    return { desde: '', hasta: '', totalDias: 0 };
  }
  
  const fechas = data.map(item => item.fecha_produccion || item.fecha_ingreso || item.fechaexpendiente)
    .filter(Boolean)
    .sort();
    
  return {
    desde: fechas[0] || '',
    hasta: fechas[fechas.length - 1] || '',
    totalDias: fechas.length
  };
}

function calculateSummary(rawData: any) {
  const ingresos = rawData.ingresos?.length || 0;
  const produccion = rawData.produccion?.length || 0;
  const pendientes = rawData.pendientes?.length || 0;
  const total = ingresos + produccion + pendientes;
  
  return {
    totalRegistros: total,
    distribucion: { ingresos, produccion, pendientes },
    estadisticas: {
      ingresosPromedioDiario: ingresos > 0 ? ingresos / Math.max(1, getUniqueDays(rawData.ingresos)) : 0,
      produccionPromedioDiaria: produccion > 0 ? produccion / Math.max(1, getUniqueDays(rawData.produccion)) : 0,
      tasaPendientes: total > 0 ? (pendientes / total) * 100 : 0
    }
  };
}

function getUniqueDays(data: any[]): number {
  if (!data) return 1;
  const fechas = new Set(data.map(item => 
    item.fecha_produccion || item.fecha_ingreso || item.fechaexpendiente
  ).filter(Boolean));
  return Math.max(1, fechas.size);
}

function structureIngresosData(data: any[]) {
  const processedData = data.map(item => ({
    fecha: item.fecha_ingreso,
    total_ingresos: item.total_ingresos || 0,
    completados: item.completados || 0,
    otros_estados: item.otros_estados || 0,
    dia_semana: getDayName(item.fecha_ingreso),
    es_laborable: isWorkday(item.fecha_ingreso)
  }));

  return {
    description: "Expedientes que ingresan al sistema por fecha",
    unit: "expedientes por día",
    structure: "fecha -> cantidad",
    data: processedData,
    aggregated: calculateIngresosAggregates(processedData)
  };
}

function structureProduccionData(data: any[]) {
  const processedData = data.map(item => ({
    fecha_produccion: item.fecha_produccion,
    evaluador: item.evaluador || 'Sin asignar',
    casos_procesados: item.casos_procesados || 0,
    dia_semana: getDayName(item.fecha_produccion),
    es_laborable: isWorkday(item.fecha_produccion)
  }));

  return {
    description: "Casos procesados por evaluadores por fecha",
    unit: "casos procesados",
    structure: "evaluador -> fecha -> cantidad",
    data: processedData,
    aggregated: calculateProduccionAggregates(processedData)
  };
}

function structurePendientesData(data: any[]) {
  const processedData = data.map(item => {
    const diasPendiente = calculateDaysDifference(item.fechaexpendiente);
    return {
      numerotramite: item.numerotramite,
      fechaexpendiente: item.fechaexpendiente,
      estadotramite: item.estadotramite,
      ultimaetapa: item.ultimaetapa,
      operador: item.operador,
      dias_pendiente: diasPendiente,
      criticidad: getCriticality(diasPendiente)
    };
  });

  return {
    description: "Expedientes pendientes de procesamiento",
    unit: "expedientes pendientes",
    structure: "pendientes ordenados por antigüedad",
    data: processedData,
    aggregated: calculatePendientesAggregates(processedData)
  };
}

function structureKPIsData(data: any) {
  return {
    description: "Indicadores clave de desempeño",
    data: {
      totalCasosCCM: data.totalCasosCCM || 0,
      totalCasosPRR: data.totalCasosPRR || 0,
      pendientesCCM: data.pendientesCCM || 0,
      pendientesPRR: data.pendientesPRR || 0,
      evaluadoresActivos: data.evaluadoresActivos || 0,
      eficiencia: {
        tasaAprobacion: calculateApprovalRate(data),
        velocidadPromedio: calculateAverageProcessingTime(data),
        cargaPromedioPorEvaluador: calculateAverageWorkload(data)
      }
    }
  };
}

function structureEvaluadoresData(data: any[]) {
  return {
    description: "Evaluadores activos y sus métricas de desempeño",
    data: data.map(item => ({
      nombre: item.nombre || item.operador || 'Sin nombre',
      casos_total: item.casos_total || 0,
      casos_completados: item.casos_completados || 0,
      casos_pendientes: item.casos_pendientes || 0,
      tasa_eficiencia: calculateEfficiency(item.casos_completados, item.casos_total),
      ultima_actividad: null // Esto podría calcularse en el futuro
    }))
  };
}

// Funciones auxiliares de cálculo
function getDayName(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('es-ES', { weekday: 'long' });
}

function isWorkday(dateStr: string): boolean {
  if (!dateStr) return false;
  const date = new Date(dateStr + 'T00:00:00');
  const day = date.getDay();
  return day >= 1 && day <= 5; // Lunes a Viernes
}

function calculateDaysDifference(dateStr: string): number {
  if (!dateStr) return 0;
  const date = new Date(dateStr + 'T00:00:00');
  const now = new Date();
  const diffTime = now.getTime() - date.getTime();
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

function getCriticality(dias: number): 'CRITICA' | 'ALTA' | 'MEDIA' | 'BAJA' {
  if (dias > 90) return 'CRITICA';
  if (dias > 60) return 'ALTA';
  if (dias > 30) return 'MEDIA';
  return 'BAJA';
}

function calculateIngresosAggregates(data: any[]) {
  const total = data.reduce((sum, item) => sum + item.total_ingresos, 0);
  const sorted = data.sort((a, b) => b.total_ingresos - a.total_ingresos);
  
  return {
    total_periodo: total,
    promedio_diario: total / Math.max(1, data.length),
    dias_con_datos: data.length,
    mejor_dia: sorted[0] ? { fecha: sorted[0].fecha, cantidad: sorted[0].total_ingresos } : null,
    peor_dia: sorted[sorted.length - 1] ? { fecha: sorted[sorted.length - 1].fecha, cantidad: sorted[sorted.length - 1].total_ingresos } : null
  };
}

function calculateProduccionAggregates(data: any[]) {
  const totalCasos = data.reduce((sum, item) => sum + item.casos_procesados, 0);
  const evaluadores = new Set(data.map(item => item.evaluador));
  
  // Agrupar por evaluador
  const porEvaluador = data.reduce((acc, item) => {
    acc[item.evaluador] = (acc[item.evaluador] || 0) + item.casos_procesados;
    return acc;
  }, {} as Record<string, number>);
  
  const mejorEvaluador = Object.entries(porEvaluador)
    .sort(([,a], [,b]) => b - a)[0];
    
  // Agrupar por día de semana
  const porDia = data.reduce((acc, item) => {
    acc[item.dia_semana] = (acc[item.dia_semana] || 0) + item.casos_procesados;
    return acc;
  }, {} as Record<string, number>);

  return {
    total_casos: totalCasos,
    evaluadores_unicos: evaluadores.size,
    promedio_por_evaluador: totalCasos / Math.max(1, evaluadores.size),
    mejor_evaluador: mejorEvaluador ? { nombre: mejorEvaluador[0], casos: mejorEvaluador[1] } : null,
    distribucion_por_dia: Object.entries(porDia).map(([dia, casos]) => ({ dia, casos }))
  };
}

function calculatePendientesAggregates(data: any[]) {
  const total = data.length;
  const antiguedadPromedio = data.reduce((sum, item) => sum + item.dias_pendiente, 0) / Math.max(1, total);
  
  const distribucion = data.reduce((acc, item) => {
    acc[item.criticidad.toLowerCase()]++;
    return acc;
  }, { critica: 0, alta: 0, media: 0, baja: 0 });
  
  const evaluadores = data.reduce((acc, item) => {
    if (item.operador) {
      acc[item.operador] = (acc[item.operador] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);

  return {
    total_pendientes: total,
    antiguedad_promedio: antiguedadPromedio,
    distribucion_criticidad: distribucion,
    evaluadores_con_pendientes: Object.entries(evaluadores)
      .map(([evaluador, cantidad]) => ({ evaluador, cantidad }))
      .sort((a, b) => b.cantidad - a.cantidad)
  };
}

function calculateApprovalRate(data: any): number {
  const total = (data.totalCasosCCM || 0) + (data.totalCasosPRR || 0);
  const pendientes = (data.pendientesCCM || 0) + (data.pendientesPRR || 0);
  return total > 0 ? ((total - pendientes) / total) * 100 : 0;
}

function calculateAverageProcessingTime(data: any): number {
  // Esto es una estimación basada en datos disponibles
  // En el futuro se podría calcular con fechas reales de inicio y fin
  return 0;
}

function calculateAverageWorkload(data: any): number {
  const total = (data.totalCasosCCM || 0) + (data.totalCasosPRR || 0);
  const evaluadores = data.evaluadoresActivos || 1;
  return total / evaluadores;
}

function calculateEfficiency(completados: number, total: number): number {
  return total > 0 ? (completados / total) * 100 : 0;
}

// Exportar tipos para uso en otras partes del sistema
export type { AIOptimizedDashboardData }; 