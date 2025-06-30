import { NextRequest, NextResponse } from 'next/server';
import { createDirectDatabaseAPI } from '@/lib/db';
import { subDays, format, eachDayOfInterval } from 'date-fns';
import { cachedOperation } from '@/lib/server-cache';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const proceso = (searchParams.get('proceso') as 'ccm' | 'prr') || 'ccm';
    const days = parseInt(searchParams.get('days') || '30');

    const cacheKey = `dashboard:throughput_analysis:${proceso}:${days}`;
    const ttl = 6 * 60 * 60; // 6 horas

    const analysisData = await cachedOperation(cacheKey, ttl, async () => {
      const dbAPI = await createDirectDatabaseAPI();
      
      const [ingresosData, produccionData] = await Promise.all([
        dbAPI.getDailyIngresos(proceso, days),
        dbAPI.getDailyProduccion(proceso, days)
      ]);

      const ingresosMap = new Map<string, number>(ingresosData.map(i => [i.fecha, i.total]));
      const produccionEvaluadoresMap = new Map<string, number>();
      const aprobacionAutomaticaMap = new Map<string, number>();

      produccionData.forEach(item => {
        const fecha = item.fecha;
        if (fecha) {
          if (item.operador?.toUpperCase() === 'USUARIO DE AGENCIA DIGITAL') {
            aprobacionAutomaticaMap.set(fecha, (aprobacionAutomaticaMap.get(fecha) || 0) + item.total);
          } else {
            produccionEvaluadoresMap.set(fecha, (produccionEvaluadoresMap.get(fecha) || 0) + item.total);
          }
        }
      });

      const endDate = new Date();
      const startDate = subDays(endDate, days - 1);
      const dateRange = eachDayOfInterval({ start: startDate, end: endDate });
      
      const data = dateRange.map(date => {
        const formattedDate = format(date, 'yyyy-MM-dd');
        return {
          fecha: format(date, 'dd/MM'),
          Ingresos: ingresosMap.get(formattedDate) || 0,
          'Producción Evaluadores': produccionEvaluadoresMap.get(formattedDate) || 0,
          'Aprobación Automática': aprobacionAutomaticaMap.get(formattedDate) || 0,
        };
      }).filter(item => {
        return item.Ingresos > 0;
      });

      return data;
    });

    return NextResponse.json({ success: true, data: analysisData });

  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor', details: (error as Error).message },
      { status: 500 }
    );
  }
} 