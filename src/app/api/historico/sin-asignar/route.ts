import { NextResponse } from 'next/server'
import { getDrizzleDB } from '@/lib/db'
import { historicoSinAsignar } from '@/lib/schema/historicos'
import { and, eq, gte } from 'drizzle-orm'
import { subDays, format } from 'date-fns'

export const dynamic = 'force-dynamic'

/**
 * Endpoint para obtener el histórico de pendientes sin asignar para un proceso específico.
 * Acepta un parámetro de búsqueda 'proceso' ('CCM' o 'PRR') y 'dias' (número).
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const proceso = searchParams.get('proceso') as 'CCM' | 'PRR' | null
  const dias = parseInt(searchParams.get('dias') || '30', 10)

  if (!proceso || !['CCM', 'PRR'].includes(proceso)) {
    return NextResponse.json(
      { success: false, error: "Parámetro 'proceso' es requerido y debe ser 'CCM' o 'PRR'." },
      { status: 400 },
    )
  }

  if (isNaN(dias) || dias <= 0) {
    return NextResponse.json(
      { success: false, error: "Parámetro 'dias' debe ser un número positivo." },
      { status: 400 },
    )
  }

  try {
    const fechaDesde = format(subDays(new Date(), dias), 'yyyy-MM-dd')

    const { db } = await getDrizzleDB({ type: 'direct' })

    const results = await db
      .select({
        fecha: historicoSinAsignar.fecha,
        total: historicoSinAsignar.sinAsignar,
      })
      .from(historicoSinAsignar)
      .where(
        and(
          eq(historicoSinAsignar.proceso, proceso),
          gte(historicoSinAsignar.fecha, fechaDesde)
        )
      )
      .orderBy(historicoSinAsignar.fecha)
    
    // Sumar los totales por si hay múltiples entradas para el mismo día (por año de expediente)
    const dataAgregada = results.reduce((acc, curr) => {
      const fecha = curr.fecha;
      if (!acc[fecha]) {
        acc[fecha] = { fecha, total: 0 };
      }
      acc[fecha].total += curr.total;
      return acc;
    }, {} as Record<string, { fecha: string; total: number }>);


    return NextResponse.json({ success: true, data: Object.values(dataAgregada) })
  } catch (error) {
    console.error('Error al obtener histórico de sin asignar:', error)
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
    return NextResponse.json(
      { success: false, error: `Error interno del servidor: ${errorMessage}` },
      { status: 500 },
    )
  }
} 