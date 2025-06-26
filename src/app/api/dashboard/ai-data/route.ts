import { NextRequest, NextResponse } from 'next/server';
import { createDirectDatabaseAPI } from '@/lib/db';
import { logInfo, logError } from '@/lib/logger';
import { cachedOperation, structureDataForAI, AIOptimizedDashboardData } from '@/lib/server-cache';

/**
 * Endpoint especializado para agentes de IA
 * Proporciona datos estructurados, documentados y optimizados para análisis automatizado
 */

interface AIDataRequest {
  proceso?: 'CCM' | 'PRR';
  incluir?: ('ingresos' | 'produccion' | 'pendientes' | 'kpis' | 'evaluadores')[];
  formato?: 'completo' | 'resumen' | 'metricas';
  periodo?: number; // días hacia atrás
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Parsear parámetros con valores por defecto
    const params: AIDataRequest = {
      proceso: (searchParams.get('proceso')?.toUpperCase() as 'CCM' | 'PRR') || 'CCM',
      incluir: searchParams.get('incluir')?.split(',') as any || ['ingresos', 'produccion', 'pendientes', 'kpis'],
      formato: (searchParams.get('formato') as any) || 'completo',
      periodo: parseInt(searchParams.get('periodo') || '30')
    };

    // Validación
    if (!['CCM', 'PRR'].includes(params.proceso!)) {
      return NextResponse.json({ 
        error: 'Proceso inválido',
        ayuda: 'Usar: proceso=CCM o proceso=PRR',
        ejemplo: '/api/dashboard/ai-data?proceso=CCM&formato=resumen'
      }, { status: 400 });
    }

    logInfo(`🤖 IA solicitando datos: ${params.proceso} - formato ${params.formato}`);

    // Obtener datos usando el sistema de caché optimizado
    const fullData = await cachedOperation<AIOptimizedDashboardData>({
      key: `dashboard:ai_data:${params.proceso}:${params.periodo}:v1`,
      ttlSeconds: 2 * 60 * 60, // 2 horas para IA

      fetcher: async (): Promise<AIOptimizedDashboardData> => {
        logInfo(`🔄 Generando datos frescos para IA: ${params.proceso}`);
        
        const dbAPI = await createDirectDatabaseAPI();
        const procesoLower = params.proceso!.toLowerCase() as 'ccm' | 'prr';

        const [ingresos, produccion, pendientes, evaluadores, kpis, processes] = await Promise.allSettled([
          params.incluir!.includes('ingresos') ? 
            (procesoLower === 'ccm' ? dbAPI.getCCMIngresos(params.periodo) : dbAPI.getPRRIngresos(params.periodo)) : 
            Promise.resolve([]),
          params.incluir!.includes('produccion') ? 
            (procesoLower === 'ccm' ? dbAPI.getAllCCMProduccion(params.periodo) : dbAPI.getAllPRRProduccion(params.periodo)) : 
            Promise.resolve([]),
          params.incluir!.includes('pendientes') ? 
            (procesoLower === 'ccm' ? dbAPI.getAllCCMPendientes() : dbAPI.getAllPRRPendientes()) : 
            Promise.resolve([]),
          params.incluir!.includes('evaluadores') ? dbAPI.getEvaluadoresGestion(procesoLower) : Promise.resolve([]),
          params.incluir!.includes('kpis') ? dbAPI.getKPIs() : Promise.resolve({}),
          dbAPI.getProcesos()
        ]);

        const rawData = {
          ingresos: ingresos.status === 'fulfilled' ? ingresos.value : [],
          produccion: produccion.status === 'fulfilled' ? produccion.value : [],
          pendientes: pendientes.status === 'fulfilled' ? pendientes.value : [],
          evaluadores: evaluadores.status === 'fulfilled' ? evaluadores.value : [],
          kpis: kpis.status === 'fulfilled' ? kpis.value : {},
          processes: processes.status === 'fulfilled' ? processes.value : [],
          metadata: { errors: [] }
        };

        return structureDataForAI(rawData, params.proceso!);
      }
    });

    // Formatear respuesta según el tipo solicitado
    let response: any;

    switch (params.formato) {
      case 'resumen':
        response = {
          meta: {
            tipo: 'resumen_ejecutivo',
            proceso: fullData.metadata.proceso,
            generado: fullData.metadata.generatedAt,
            periodo: `${params.periodo} días`,
            guia_interpretacion: {
              criticidad_pendientes: {
                CRITICA: '> 90 días sin procesar',
                ALTA: '60-90 días sin procesar', 
                MEDIA: '30-60 días sin procesar',
                BAJA: '< 30 días sin procesar'
              },
              eficiencia_evaluadores: {
                excelente: '> 150% del promedio esperado',
                buena: '100-150% del promedio',
                regular: '70-100% del promedio',
                baja: '< 70% del promedio'
              }
            }
          },
          resumen: {
            total_registros: fullData.metadata.summary.totalRegistros,
            ingresos_promedio_diario: fullData.metadata.summary.estadisticas.ingresosPromedioDiario,
            produccion_promedio_diaria: fullData.metadata.summary.estadisticas.produccionPromedioDiaria,
            tasa_pendientes: fullData.metadata.summary.estadisticas.tasaPendientes,
            pendientes_criticos: fullData.pendientes.aggregated.distribucion_criticidad.critica,
            evaluador_mas_productivo: fullData.produccion.aggregated.mejor_evaluador
          },
          alertas: generateAIAlerts(fullData),
          recomendaciones: generateAIRecommendations(fullData)
        };
        break;

      case 'metricas':
        response = {
          meta: {
            tipo: 'metricas_numericas',
            proceso: fullData.metadata.proceso,
            generado: fullData.metadata.generatedAt
          },
          metricas: {
            kpis: fullData.kpis.data,
            agregados: {
              ingresos: fullData.ingresos.aggregated,
              produccion: fullData.produccion.aggregated,
              pendientes: fullData.pendientes.aggregated
            },
            tendencias: calculateTrends(fullData)
          }
        };
        break;

      default: // completo
        response = {
          meta: {
            tipo: 'datos_completos',
            version: '2.0',
            optimizado_para: 'analisis_ia',
            proceso: fullData.metadata.proceso,
            generado: fullData.metadata.generatedAt,
            documentacion: {
              estructura: 'Cada sección incluye description, unit, structure y data',
              fechas: 'Formato YYYY-MM-DD para consistencia',
              contexto: 'Campos contexto añadidos para interpretación IA',
              agregados: 'Métricas precalculadas para análisis rápido'
            }
          },
          datos: fullData
        };
    }

    logInfo(`✅ Datos IA entregados: ${params.formato} para ${params.proceso} (${fullData.metadata.summary.totalRegistros} registros)`);

    return NextResponse.json(response, {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'public, max-age=3600', // 1 hora de cache en cliente
        'X-Data-Version': '2.0',
        'X-Optimized-For': 'AI-Analysis'
      }
    });

  } catch (error) {
    logError('❌ Error en endpoint IA:', error);
    return NextResponse.json({
      error: 'Error interno del servidor',
      timestamp: new Date().toISOString(),
      ayuda: 'Contactar al administrador del sistema'
    }, { status: 500 });
  }
}

// Funciones auxiliares para análisis IA
function generateAIAlerts(data: AIOptimizedDashboardData): string[] {
  const alerts: string[] = [];
  
  // Alertas por pendientes críticos
  if (data.pendientes.aggregated.distribucion_criticidad.critica > 10) {
    alerts.push(`CRÍTICO: ${data.pendientes.aggregated.distribucion_criticidad.critica} expedientes con más de 90 días pendientes`);
  }
  
  // Alertas por baja productividad
  if (data.produccion.aggregated.promedio_por_evaluador < 5) {
    alerts.push(`ATENCIÓN: Productividad promedio baja (${data.produccion.aggregated.promedio_por_evaluador.toFixed(1)} casos/evaluador)`);
  }
  
  // Alertas por caída en ingresos
  if (data.ingresos.aggregated.promedio_diario < 10) {
    alerts.push(`MONITOREO: Ingresos diarios bajos (${data.ingresos.aggregated.promedio_diario.toFixed(1)} expedientes/día)`);
  }

  return alerts;
}

function generateAIRecommendations(data: AIOptimizedDashboardData): string[] {
  const recommendations: string[] = [];
  
  // Recomendaciones basadas en pendientes
  if (data.pendientes.aggregated.distribucion_criticidad.critica > 0) {
    recommendations.push('Priorizar expedientes críticos (>90 días) para reducir riesgo operacional');
  }
  
  // Recomendaciones de redistribución
  const evaluadoresDesbalanceados = data.pendientes.aggregated.evaluadores_con_pendientes
    .filter((e: any) => e.cantidad > data.pendientes.aggregated.total_pendientes * 0.3);
  
  if (evaluadoresDesbalanceados.length > 0) {
    recommendations.push(`Redistribuir carga de ${evaluadoresDesbalanceados[0].evaluador} (${evaluadoresDesbalanceados[0].cantidad} pendientes)`);
  }
  
  // Recomendaciones de proceso
  if (data.ingresos.aggregated.promedio_diario > data.produccion.aggregated.promedio_por_evaluador * data.produccion.aggregated.evaluadores_unicos) {
    recommendations.push('Considerar aumentar capacidad de procesamiento o evaluar bottlenecks');
  }

  return recommendations;
}

function calculateTrends(data: AIOptimizedDashboardData): any {
  // Calcular tendencias básicas (esto se podría expandir con más lógica estadística)
  return {
    ingresos_tendencia: data.ingresos.data.length > 7 ? 'estable' : 'insuficientes_datos',
    produccion_tendencia: data.produccion.aggregated.evaluadores_unicos > 0 ? 'activa' : 'inactiva',
    pendientes_tendencia: data.pendientes.aggregated.antiguedad_promedio > 45 ? 'empeorando' : 'controlado'
  };
} 