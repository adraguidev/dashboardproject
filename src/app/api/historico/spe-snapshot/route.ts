import { NextResponse, NextRequest } from 'next/server'
import { createDirectDatabaseAPI } from '@/lib/db'
import { format } from 'date-fns'
import { toZonedTime } from 'date-fns-tz'

export const dynamic = 'force-dynamic'

async function takeSpeSnapshot(api: import('@/lib/db').DirectDatabaseAPI) {
  const limaTimeZone = 'America/Lima'
  const nowUTC = new Date()
  const nowInLima = toZonedTime(nowUTC, limaTimeZone)
  const fecha = format(nowInLima, 'yyyy-MM-dd')
  const trimestre = Math.floor(nowInLima.getMonth() / 3) + 1

  console.log(`🕐 Hora UTC: ${nowUTC.toISOString()}`)
  console.log(`🕐 Hora Lima: ${nowInLima.toISOString()}`)
  console.log(`📅 Fecha calculada para snapshot: ${fecha}`)
  console.log(`🔍 Iniciando snapshot SPE para fecha: ${fecha}, trimestre: ${trimestre}`)

  // 1. BORRAR los registros existentes del día para SPE
  console.log(`🗑️ Eliminando snapshots SPE existentes en fecha ${fecha}...`)
  await api.deleteHistoricoDelDiaSpe(fecha)

  // 2. Obtener todos los pendientes de SPE desde Google Sheets
  const allSpePendientes = await api.getAllSpePendientes()
  console.log(`📊 Datos SPE obtenidos: ${allSpePendientes.length} evaluadores con pendientes`)

  const results = {
    evaluadores: 0,
    totalPendientes: 0
  }

  if (allSpePendientes.length > 0) {
    // 3. Preparar datos para insertar
    const historicosOperador = allSpePendientes.map(item => ({
      fecha,
      trimestre,
      operador: item.evaluador,
      pendientes: item.pendientes,
    }))
    
    // 4. Insertar/actualizar en la base de datos
    await api.upsertHistoricoSpePendientes(historicosOperador)
    
    results.evaluadores = historicosOperador.length
    results.totalPendientes = allSpePendientes.reduce((sum, item) => sum + item.pendientes, 0)
    
    console.log(`✅ Snapshot SPE creado: ${results.evaluadores} evaluadores, ${results.totalPendientes} pendientes totales`)
  } else {
    console.log('⚠️ No se encontraron pendientes de SPE para el snapshot')
  }

  return results
}

// Endpoint para ser llamado desde el cliente (botón manual) o GitHub Actions
export async function POST(request: NextRequest) {
  try {
    // Verificar si es llamada interna desde GitHub Actions
    const authHeader = request.headers.get('Authorization')
    const isInternalCall = authHeader === `Bearer ${process.env.INTERNAL_API_SECRET}`
    
    if (isInternalCall) {
      console.log('🤖 Snapshot automático SPE invocado desde GitHub Actions')
    } else {
      console.log('🔑 Snapshot manual SPE invocado por un usuario')
      // TODO: AQUÍ IRÍA LA LÓGICA DE AUTENTICACIÓN DEL USUARIO para llamadas manuales
      // const session = await getAuthSession();
      // if (!session?.user?.isAdmin) {
      //   return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 403 });
      // }
    }

    const api = await createDirectDatabaseAPI({ type: 'direct' })
    const results = await takeSpeSnapshot(api)
    
    return NextResponse.json({ 
      success: true, 
      results,
      message: `Snapshot SPE creado exitosamente: ${results.evaluadores} evaluadores, ${results.totalPendientes} pendientes`
    })

  } catch (error) {
    console.error('❌ Error tomando el snapshot manual SPE:', error)
    return NextResponse.json({ 
      success: false, 
      error: (error as Error).message 
    }, { status: 500 })
  }
} 