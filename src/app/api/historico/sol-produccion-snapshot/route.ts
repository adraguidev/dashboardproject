import { NextResponse, NextRequest } from 'next/server'
import { createDirectDatabaseAPI } from '@/lib/db'
import { format, subDays } from 'date-fns'
import { toZonedTime } from 'date-fns-tz'

export const dynamic = 'force-dynamic'

async function takeSolProduccionSnapshot(api: import('@/lib/db').DirectDatabaseAPI, targetDateStr: string) {
  console.log(`🔍 Iniciando snapshot de producción SOL para fecha: ${targetDateStr}`)

  // 1. Obtener toda la producción desde Google Sheets
  const allSolProduccion = await api.getProduccionSolFromGoogleSheets()
  console.log(`📊 Datos de producción SOL obtenidos de Google Sheets: ${allSolProduccion.length} registros totales`)

  // 2. Filtrar los registros que corresponden a la fecha objetivo
  const produccionDelDia = allSolProduccion.filter((item: any) => item.fechaTrabajo === targetDateStr)

  console.log(`🎯 Registros encontrados para la fecha ${targetDateStr}: ${produccionDelDia.length}`)
  
  const results = {
    evaluadores: 0,
    totalExpedientes: 0,
    fecha: targetDateStr
  }

  if (produccionDelDia.length > 0) {
    // 3. BORRAR los registros existentes de la fecha para evitar duplicados y asegurar consistencia
    console.log(`🗑️ Eliminando snapshots de producción SOL existentes en fecha ${targetDateStr}...`)
    await api.deleteHistoricoDelDiaSolProduccion(targetDateStr)
    
    // 4. Preparar datos para insertar
    const historicosProduccion = produccionDelDia.map((item: any) => ({
      fecha: item.fechaTrabajo,
      evaluador: item.evaluador,
      total: item.total,
    }))
    
    // 5. Insertar/actualizar en la base de datos
    await api.upsertHistoricoSolProduccion(historicosProduccion)
    
    results.evaluadores = [...new Set(historicosProduccion.map(p => p.evaluador))].length
    results.totalExpedientes = historicosProduccion.reduce((sum, item) => sum + item.total, 0)
    
    console.log(`✅ Snapshot de Producción SOL creado: ${results.evaluadores} evaluadores, ${results.totalExpedientes} expedientes para el ${targetDateStr}`)
  } else {
    console.log(`⚠️ No se encontró producción de SOL para la fecha ${targetDateStr}`)
  }

  return results
}

// Endpoint para ser llamado desde GitHub Actions
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (authHeader !== `Bearer ${process.env.INTERNAL_API_SECRET}`) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    let targetDateStr = body.date; // Permite pasar una fecha específica para backfilling

    // Si no se provee una fecha, por defecto se procesa el día de ayer
    if (!targetDateStr) {
      const limaTimeZone = 'America/Lima'
      const nowInLima = toZonedTime(new Date(), limaTimeZone)
      const yesterdayInLima = subDays(nowInLima, 1)
      targetDateStr = format(yesterdayInLima, 'yyyy-MM-dd')
      console.log(`🤖 Snapshot automático de Producción SOL invocado. Fecha objetivo (ayer): ${targetDateStr}`)
    } else {
      console.log(`🔑 Snapshot manual de Producción SOL invocado para la fecha: ${targetDateStr}`)
    }

    const api = await createDirectDatabaseAPI({ type: 'direct' })
    const results = await takeSolProduccionSnapshot(api, targetDateStr)
    
    return NextResponse.json({ 
      success: true, 
      results,
      message: `Snapshot de Producción SOL para ${targetDateStr} creado: ${results.evaluadores} evaluadores, ${results.totalExpedientes} expedientes.`
    })

  } catch (error) {
    console.error('❌ Error tomando el snapshot de producción SOL:', error)
    return NextResponse.json({ 
      success: false, 
      error: (error as Error).message 
    }, { status: 500 })
  }
} 