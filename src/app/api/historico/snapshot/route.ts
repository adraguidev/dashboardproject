import { NextResponse } from 'next/server'
import { createDirectDatabaseAPI, tableCCM, tablePRR } from '@/lib/db'
import { historicoPendientesOperador, historicoSinAsignar } from '@/lib/schema/historicos'
import { count, eq, sql } from 'drizzle-orm'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { toZonedTime } from 'date-fns-tz'
import { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

async function takeSnapshot(api: any) {
  const limaTimeZone = 'America/Lima'
  const db = api['db']

  const nowInLima = toZonedTime(new Date(), limaTimeZone)
  const fecha = format(nowInLima, 'yyyy-MM-dd')
  const trimestre = Math.floor(nowInLima.getMonth() / 3) + 1

  console.log(`Iniciando snapshot para fecha: ${fecha}, trimestre: ${trimestre}`)

  const processes: Array<{
    name: 'CCM' | 'PRR'
    table: typeof tableCCM | typeof tablePRR
  }> = [
    { name: 'CCM', table: tableCCM },
    { name: 'PRR', table: tablePRR },
  ]

  const results = {
    operador: { CCM: 0, PRR: 0 },
    sinAsignar: { CCM: 0, PRR: 0 },
  }

  for (const process of processes) {
    // 1. Snapshot de pendientes por operador y año
    const pendientesPorOperador = await db
      .select({
        operador: process.table.operador,
        anioExpediente: sql<number>`CAST(${process.table.anio} AS integer)`,
        pendientes: count(),
      })
      .from(process.table)
      .where(sql`${process.table.estadotramite} = 'PENDIENTE' AND ${process.table.operador} IS NOT NULL AND ${process.table.operador} != ''`)
      .groupBy(process.table.operador, sql`CAST(${process.table.anio} AS integer)`)

    if (pendientesPorOperador.length > 0) {
      const dataToInsert = pendientesPorOperador.map((row: any) => ({
        fecha,
        trimestre,
        proceso: process.name,
        operador: row.operador as string,
        anioExpediente: row.anioExpediente,
        pendientes: row.pendientes,
      }))

      await db
        .insert(historicoPendientesOperador)
        .values(dataToInsert)
        .onConflictDoUpdate({
          target: [
            historicoPendientesOperador.fecha,
            historicoPendientesOperador.proceso,
            historicoPendientesOperador.operador,
            historicoPendientesOperador.anioExpediente,
          ],
          set: {
            pendientes: sql`excluded.pendientes`,
          },
        })
      results.operador[process.name] = dataToInsert.length
    }

    // 2. Snapshot de pendientes sin asignar
    const sinAsignarResult = await db
      .select({
        anioExpediente: sql<number>`CAST(${process.table.anio} AS integer)`,
        sinAsignar: count(),
      })
      .from(process.table)
      .where(sql`${process.table.estadotramite} = 'PENDIENTE' AND (${process.table.operador} IS NULL OR ${process.table.operador} = '')`)
      .groupBy(sql`CAST(${process.table.anio} AS integer)`)
      
    if (sinAsignarResult.length > 0) {
      const dataToInsert = sinAsignarResult.map((row: any) => ({
        fecha,
        trimestre,
        proceso: process.name,
        anioExpediente: row.anioExpediente,
        sinAsignar: row.sinAsignar
      }))

      await db
        .insert(historicoSinAsignar)
        .values(dataToInsert)
        .onConflictDoUpdate({
          target: [
            historicoSinAsignar.fecha,
            historicoSinAsignar.proceso,
            historicoSinAsignar.anioExpediente,
          ],
          set: {
            sinAsignar: sql`excluded.sin_asignar`,
          },
        })
      results.sinAsignar[process.name] = dataToInsert.length
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
  } catch (error: any) {
    console.error('Error tomando el snapshot del histórico:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
} 