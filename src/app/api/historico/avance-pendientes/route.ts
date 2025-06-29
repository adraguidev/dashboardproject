import { NextResponse } from 'next/server'
import { createDirectDatabaseAPI } from '@/lib/db'
import { historicoPendientesOperador } from '@/lib/schema/historicos'
import { desc, eq, and } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const api = await createDirectDatabaseAPI({ type: 'direct' })
    const db = api['db']
    
    const { searchParams } = new URL(request.url)
    const proceso = searchParams.get('proceso') || 'CCM'
    const anio = searchParams.get('anio')
    
    // Construir condiciones de filtro
    let whereConditions = [eq(historicoPendientesOperador.proceso, proceso as 'CCM' | 'PRR')]
    
    if (anio) {
      whereConditions.push(eq(historicoPendientesOperador.anioExpediente, parseInt(anio)))
    }

    // Obtener datos históricos ordenados por fecha
    const historicos = await db
      .select({
        fecha: historicoPendientesOperador.fecha,
        operador: historicoPendientesOperador.operador,
        anioExpediente: historicoPendientesOperador.anioExpediente,
        pendientes: historicoPendientesOperador.pendientes,
        trimestre: historicoPendientesOperador.trimestre,
      })
      .from(historicoPendientesOperador)
      .where(and(...whereConditions))
      .orderBy(
        historicoPendientesOperador.operador,
        desc(historicoPendientesOperador.fecha)
      )

    // Obtener fechas únicas para el header de la tabla
    const fechasUnicas = [...new Set(historicos.map(h => h.fecha))].sort().reverse()
    
    // Obtener operadores únicos
    const operadoresUnicos = [...new Set(historicos.map(h => h.operador))].sort()

    // Estructurar datos para la tabla
    const datosTabla = operadoresUnicos.map(operador => {
      const filaOperador: any = { operador }
      
      fechasUnicas.forEach(fecha => {
        const registrosFecha = historicos.filter(h => h.operador === operador && h.fecha === fecha)
        const totalPendientes = registrosFecha.reduce((sum, r) => sum + r.pendientes, 0)
        filaOperador[fecha] = totalPendientes
      })
      
      return filaOperador
    })

    return NextResponse.json({
      success: true,
      data: {
        fechas: fechasUnicas,
        operadores: datosTabla,
        proceso,
        anio: anio ? parseInt(anio) : null
      }
    })

  } catch (error: any) {
    console.error('Error obteniendo avance de pendientes:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
} 