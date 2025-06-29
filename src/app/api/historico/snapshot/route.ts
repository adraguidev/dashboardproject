import { NextResponse } from 'next/server'
import { createDirectDatabaseAPI, tableCCM, tablePRR } from '@/lib/db'
import { historicoPendientesOperador, historicoSinAsignar } from '@/lib/schema/historicos'
import { count, sql } from 'drizzle-orm'
import { format } from 'date-fns'
import { toZonedTime } from 'date-fns-tz'
import { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

interface SnapshotResult {
  operador: string,
  anioExpediente: number,
  pendientes: number
}

interface SinAsignarResult {
  anioExpediente: number,
  sinAsignar: number
}

async function takeSnapshot(api: import('@/lib/db').DirectDatabaseAPI) {
  const limaTimeZone = 'America/Lima'

  const nowInLima = toZonedTime(new Date(), limaTimeZone)
  const fecha = format(nowInLima, 'yyyy-MM-dd')
  const trimestre = Math.floor(nowInLima.getMonth() / 3) + 1

  console.log(`Iniciando snapshot para fecha: ${fecha}, trimestre: ${trimestre}`)

  const processes: Array<{
    name: 'CCM' | 'PRR'
    fetcher: () => Promise<any[]>
  }> = [
    { name: 'CCM', fetcher: () => api.getAllCCMPendientes() },
    { name: 'PRR', fetcher: () => api.getAllPRRPendientes() },
  ]

  const results = {
    operador: { CCM: 0, PRR: 0 },
    sinAsignar: { CCM: 0, PRR: 0 },
  }

  for (const process of processes) {
    const allPendientes = await process.fetcher();

    // 1. Snapshot de pendientes por operador y año
    const pendientesPorOperador = allPendientes
      .filter((p: any) => p.operador && p.operador.trim() !== '')
      .reduce((acc: Record<string, SnapshotResult>, p: any) => {
        const key = `${p.operador}-${p.anio}`;
        if (!acc[key]) {
          acc[key] = {
            operador: p.operador,
            anioExpediente: parseInt(p.anio || '0', 10),
            pendientes: 0
          };
        }
        acc[key].pendientes++;
        return acc;
      }, {});
    
    const pendientesData = Object.values(pendientesPorOperador);

    if (pendientesData.length > 0) {
      const dataToInsert = pendientesData.map(row => ({
        fecha,
        trimestre,
        proceso: process.name,
        operador: row.operador,
        anioExpediente: row.anioExpediente,
        pendientes: row.pendientes,
      }));
      await api.upsertHistoricoPendientesOperador(dataToInsert);
      results.operador[process.name] = dataToInsert.length;
    }

    // 2. Snapshot de pendientes sin asignar
    const sinAsignarPorAnio = allPendientes
      .filter((p: any) => !p.operador || p.operador.trim() === '')
      .reduce((acc: Record<number, number>, p: any) => {
        const anio = parseInt(p.anio || '0', 10);
        acc[anio] = (acc[anio] || 0) + 1;
        return acc;
      }, {});

    const sinAsignarData: SinAsignarResult[] = Object.entries(sinAsignarPorAnio).map(([anio, count]) => ({
      anioExpediente: parseInt(anio, 10),
      sinAsignar: count,
    }));
      
    if (sinAsignarData.length > 0) {
      const dataToInsert = sinAsignarData.map((row: SinAsignarResult) => ({
        fecha,
        trimestre,
        proceso: process.name,
        anioExpediente: row.anioExpediente,
        sinAsignar: row.sinAsignar
      }));

      await api.upsertHistoricoSinAsignar(dataToInsert);
      results.sinAsignar[process.name] = dataToInsert.length;
    }
  }

  return results
}

export async function POST(request: NextRequest) {
  try {
    const api = await createDirectDatabaseAPI({ type: 'direct' });
    
    // Verificar autorización interna
    const authHeader = request.headers.get('Authorization');
    if (authHeader !== `Bearer ${process.env.INTERNAL_API_SECRET}`) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
    }

    const results = await takeSnapshot(api);
    return NextResponse.json({ success: true, results });
  } catch (error) {
    console.error('Error tomando el snapshot del histórico:', error);
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
} 