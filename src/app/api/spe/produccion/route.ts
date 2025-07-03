import { NextRequest, NextResponse } from 'next/server'
import { getDrizzleDB } from '@/lib/db'
import { historicoSpeProduccionAgg } from '@/lib/schema/historicos'
import { cachedOperation } from '@/lib/server-cache'
import { logError, logInfo } from '@/lib/logger'
import { format } from 'date-fns'
import { desc } from 'drizzle-orm'

interface ProduccionItem {
  evaluador: string;
  expedientesPorFecha: { [fecha: string]: { total: number, finalizadas: number, iniciadas: number } };
  expedientesPorMes: { [mes: string]: { total: number, finalizadas: number, iniciadas: number } };
  expedientesPorAnio: { [anio: string]: { total: number, finalizadas: number, iniciadas: number } };
  totalGeneral: number;
}

async function getProduccionFromDB(): Promise<ProduccionItem[]> {
  logInfo('Obteniendo datos de producción SPE desde base de datos.');
  
  const { db } = await getDrizzleDB({ type: 'direct' });
  
  // Obtener todos los registros de producción histórica
  const registros = await db
    .select({
      fecha: historicoSpeProduccionAgg.fecha,
      evaluador: historicoSpeProduccionAgg.evaluador,
      total: historicoSpeProduccionAgg.total,
      finalizadas: historicoSpeProduccionAgg.finalizadas,
      iniciadas: historicoSpeProduccionAgg.iniciadas,
    })
    .from(historicoSpeProduccionAgg)
    .orderBy(desc(historicoSpeProduccionAgg.fecha));

  logInfo(`Registros encontrados en BD: ${registros.length}`);

  if (registros.length === 0) {
    logInfo('No hay datos de producción SPE en la base de datos.');
    return [];
  }

  // Agrupar por evaluador
  const produccionAgrupada: { [evaluador: string]: ProduccionItem } = {};

  registros.forEach(registro => {
    const { fecha, evaluador, total, finalizadas, iniciadas } = registro;
    const fechaStr = fecha; // Ya viene como string desde la BD
    const fechaDate = new Date(fechaStr);
    const mesStr = format(fechaDate, 'yyyy-MM');
    const anioStr = format(fechaDate, 'yyyy');

    if (!produccionAgrupada[evaluador]) {
      produccionAgrupada[evaluador] = {
        evaluador,
        expedientesPorFecha: {},
        expedientesPorMes: {},
        expedientesPorAnio: {},
        totalGeneral: 0,
      };
    }

    const item = produccionAgrupada[evaluador];

    // Agregar por fecha
    if (!item.expedientesPorFecha[fechaStr]) {
      item.expedientesPorFecha[fechaStr] = { total: 0, finalizadas: 0, iniciadas: 0 };
    }
    item.expedientesPorFecha[fechaStr].total += total;
    item.expedientesPorFecha[fechaStr].finalizadas += finalizadas;
    item.expedientesPorFecha[fechaStr].iniciadas += iniciadas;

    // Agregar por mes
    if (!item.expedientesPorMes[mesStr]) {
      item.expedientesPorMes[mesStr] = { total: 0, finalizadas: 0, iniciadas: 0 };
    }
    item.expedientesPorMes[mesStr].total += total;
    item.expedientesPorMes[mesStr].finalizadas += finalizadas;
    item.expedientesPorMes[mesStr].iniciadas += iniciadas;

    // Agregar por año
    if (!item.expedientesPorAnio[anioStr]) {
      item.expedientesPorAnio[anioStr] = { total: 0, finalizadas: 0, iniciadas: 0 };
    }
    item.expedientesPorAnio[anioStr].total += total;
    item.expedientesPorAnio[anioStr].finalizadas += finalizadas;
    item.expedientesPorAnio[anioStr].iniciadas += iniciadas;

    // Sumar al total general
    item.totalGeneral += total;
  });

  const evaluadores = Object.keys(produccionAgrupada);
  logInfo(`Evaluadores únicos: ${evaluadores.length}`);
  logInfo(`Evaluadores: ${evaluadores.join(', ')}`);

  // Obtener fechas únicas para logs
  const fechasUnicas = [...new Set(registros.map(r => r.fecha))].sort();
  logInfo(`Rango de fechas: ${fechasUnicas[fechasUnicas.length - 1]} a ${fechasUnicas[0]}`);

  return Object.values(produccionAgrupada).sort((a, b) => b.totalGeneral - a.totalGeneral);
}

export async function GET(request: NextRequest) {
  const cacheKey = `spe:produccion:db:v1`;
  const ttl = 5 * 60; // 5 minutos de caché

  try {
    const data = await cachedOperation<ProduccionItem[]>({
      key: cacheKey,
      ttlSeconds: ttl,
      fetcher: getProduccionFromDB,
      validator: (data) => Array.isArray(data),
    });

    // Añadir metadatos de períodos disponibles
    const todasLasFechas = new Set<string>();
    const todosLosMeses = new Set<string>();
    const todosLosAnios = new Set<string>();

    data.forEach(item => {
      Object.keys(item.expedientesPorFecha).forEach(fecha => todasLasFechas.add(fecha));
      Object.keys(item.expedientesPorMes).forEach(mes => todosLosMeses.add(mes));
      Object.keys(item.expedientesPorAnio).forEach(anio => todosLosAnios.add(anio));
    });

    const fechasOrdenadas = Array.from(todasLasFechas).sort();
    const mesesOrdenados = Array.from(todosLosMeses).sort();
    const aniosOrdenados = Array.from(todosLosAnios).sort();

    logInfo(`Períodos disponibles - Fechas: ${fechasOrdenadas.length}, Meses: ${mesesOrdenados.length}, Años: ${aniosOrdenados.length}`);

    return NextResponse.json({ 
      success: true, 
      data, 
      periodos: {
        fechas: fechasOrdenadas,
        meses: mesesOrdenados,
        anios: aniosOrdenados,
      }
    });

  } catch (error) {
    logError('Error en el endpoint /api/spe/produccion:', error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
} 