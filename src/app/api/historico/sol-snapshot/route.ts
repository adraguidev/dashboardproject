import { NextResponse, NextRequest } from 'next/server'
import { createDirectDatabaseAPI } from '@/lib/db'
import { format } from 'date-fns'
import { toZonedTime } from 'date-fns-tz'

export const dynamic = 'force-dynamic'

async function takeSolSnapshot(api: import('@/lib/db').DirectDatabaseAPI) {
  const limaTimeZone = 'America/Lima'
  const nowUTC = new Date()
  const nowInLima = toZonedTime(nowUTC, limaTimeZone)
  const fecha = format(nowInLima, 'yyyy-MM-dd')
  const trimestre = Math.floor(nowInLima.getMonth() / 3) + 1

  console.log(`🕐 Hora UTC: ${nowUTC.toISOString()}`)
  console.log(`🕐 Hora Lima: ${nowInLima.toISOString()}`)
  console.log(`📅 Fecha calculada para snapshot: ${fecha}`)
  console.log(`🔍 Iniciando snapshot SOL para fecha: ${fecha}, trimestre: ${trimestre}`)

  // 1. BORRAR los registros existentes del día para SOL
  console.log(`🗑️ Eliminando snapshots SOL existentes en fecha ${fecha}...`)
  await api.deleteHistoricoDelDiaSol(fecha)

  // 2. Obtener todos los pendientes de SOL desde Google Sheets
  const allSolPendientes = await api.getAllSolPendientes()
  console.log(`📊 Datos SOL obtenidos: ${allSolPendientes.length} evaluadores con pendientes`)

  const results = {
    evaluadores: 0,
    totalPendientes: 0
  }

  if (allSolPendientes.length > 0) {
    // 3. Preparar datos para insertar con timestamp explícito de Lima
    const createdAtLima = nowInLima // Usar el objeto Date de Lima directamente
    
    const historicosOperador = allSolPendientes.map(item => ({
      fecha,
      trimestre,
      operador: item.evaluador,
      pendientes: item.pendientes,
      createdAt: createdAtLima, // Timestamp explícito en zona horaria de Lima
    }))
    
    // 4. Insertar/actualizar en la base de datos
    await api.upsertHistoricoSolPendientes(historicosOperador)
    
    results.evaluadores = historicosOperador.length
    results.totalPendientes = allSolPendientes.reduce((sum, item) => sum + item.pendientes, 0)
    
    console.log(`✅ Snapshot SOL creado: ${results.evaluadores} evaluadores, ${results.totalPendientes} pendientes totales`)
  } else {
    console.log('⚠️ No se encontraron pendientes de SOL para el snapshot')
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
      console.log('🤖 Snapshot automático SOL invocado desde GitHub Actions')
    } else {
      console.log('🔑 Snapshot manual SOL invocado por un usuario')
      // TODO: AQUÍ IRÍA LA LÓGICA DE AUTENTICACIÓN DEL USUARIO para llamadas manuales
      // const session = await getAuthSession();
      // if (!session?.user?.isAdmin) {
      //   return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 403 });
      // }
    }

    const api = await createDirectDatabaseAPI({ type: 'direct' })
    const results = await takeSolSnapshot(api)
    
    return NextResponse.json({ 
      success: true, 
      results,
      message: `Snapshot SOL creado exitosamente: ${results.evaluadores} evaluadores, ${results.totalPendientes} pendientes`
    })

  } catch (error) {
    console.error('❌ Error tomando el snapshot manual SOL:', error)
    return NextResponse.json({ 
      success: false, 
      error: (error as Error).message 
    }, { status: 500 })
  }
} 