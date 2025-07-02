import { NextResponse } from 'next/server'
import { createDirectDatabaseAPI } from '@/lib/db'
import { historicoSpePendientes } from '@/lib/schema/historicos'
import { desc, eq, and } from 'drizzle-orm'
import { cachedOperation } from '@/lib/server-cache'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    // Para SPE no necesitamos filtrar por año como CCM/PRR
    
    const cacheKey = `dashboard:spe_avance_pendientes:all`
    const ttl = 6 * 60 * 60 // 6 horas de caché

    const data = await cachedOperation({
      key: cacheKey,
      ttlSeconds: ttl,
      fetcher: async () => {
        const api = await createDirectDatabaseAPI({ type: 'direct' })
        const db = api['db']

        // Obtener datos históricos de SPE ordenados por fecha
        const historicos = await db
          .select({
            fecha: historicoSpePendientes.fecha,
            operador: historicoSpePendientes.operador,
            pendientes: historicoSpePendientes.pendientes,
            trimestre: historicoSpePendientes.trimestre,
          })
          .from(historicoSpePendientes)
          .orderBy(
            historicoSpePendientes.operador,
            desc(historicoSpePendientes.fecha)
          )

        // Obtener fechas únicas para el header de la tabla
        const fechasUnicas = [...new Set(historicos.map(h => h.fecha))].sort().reverse()
        
        // Debug: Log de fechas encontradas
        console.log(`📅 Fechas en BD: ${fechasUnicas.join(', ')}`)
        console.log(`📊 Total registros históricos: ${historicos.length}`)
        
        // Obtener operadores únicos
        const operadoresUnicos = [...new Set(historicos.map(h => h.operador))].sort()

        // Estructurar datos para la tabla
        const datosTabla = operadoresUnicos.map(operador => {
          const filaOperador: { [key: string]: string | number } = { operador }
          
          fechasUnicas.forEach(fecha => {
            const registrosFecha = historicos.filter(h => h.operador === operador && h.fecha === fecha)
            const totalPendientes = registrosFecha.reduce((sum, r) => sum + (r.pendientes || 0), 0)
            filaOperador[fecha] = totalPendientes
          })
          
          return filaOperador
        })

        return {
          fechas: fechasUnicas,
          operadores: datosTabla,
          proceso: 'SPE',
          anio: null // SPE no usa años
        }
      }
    })

    return NextResponse.json({ success: true, data })

  } catch (error) {
    console.error('Error obteniendo avance de pendientes SPE:', error)
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    )
  }
} 