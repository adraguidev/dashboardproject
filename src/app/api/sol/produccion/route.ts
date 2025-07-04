import { NextRequest, NextResponse } from 'next/server'
import { createDirectDatabaseAPI } from '@/lib/db'
import { historicoSolProduccionAgg } from '@/lib/schema/historicos'
import { cachedOperation } from '@/lib/server-cache'
import { logError, logInfo } from '@/lib/logger'
import { format } from 'date-fns'
import { desc } from 'drizzle-orm'

interface ProduccionItem {
  evaluador: string;
  expedientesPorFecha: { [fecha: string]: number };
  expedientesPorMes: { [mes: string]: number };
  expedientesPorAnio: { [anio: string]: number };
  totalGeneral: number;
}

// Esta función ahora solo lee de la BD, igual que en SPE
async function getProduccionFromDB(): Promise<ProduccionItem[]> {
  logInfo('Obteniendo datos de producción SOL desde base de datos.');
  
  const { db } = await createDirectDatabaseAPI({ type: 'direct' });
  
  const registros = await db
    .select({
      fecha: historicoSolProduccionAgg.fecha,
      evaluador: historicoSolProduccionAgg.evaluador,
      total: historicoSolProduccionAgg.total,
    })
    .from(historicoSolProduccionAgg)
    .orderBy(desc(historicoSolProduccionAgg.fecha));

  logInfo(`Registros de producción SOL encontrados en BD: ${registros.length}`);

  if (registros.length === 0) {
    return [];
  }

  const produccionAgrupada: { [evaluador: string]: ProduccionItem } = {};

  registros.forEach(registro => {
    const { fecha, evaluador, total } = registro;
    const fechaStr = fecha;
    const fechaDate = new Date(`${fechaStr}T12:00:00Z`); // Asumir UTC para evitar problemas de TZ
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
    
    item.expedientesPorFecha[fechaStr] = (item.expedientesPorFecha[fechaStr] || 0) + total;
    item.expedientesPorMes[mesStr] = (item.expedientesPorMes[mesStr] || 0) + total;
    item.expedientesPorAnio[anioStr] = (item.expedientesPorAnio[anioStr] || 0) + total;
    item.totalGeneral += total;
  });

  return Object.values(produccionAgrupada).sort((a, b) => b.totalGeneral - a.totalGeneral);
}

export async function GET(request: NextRequest) {
  const cacheKey = `sol:produccion:db:v2`; // Nueva versión para invalidar caché
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
    logError('Error en el endpoint /api/sol/produccion:', error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
} 