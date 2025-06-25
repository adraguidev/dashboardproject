import { NextResponse } from 'next/server'
import { neonDB } from '@/lib/neon-api'

export async function GET() {
  try {
    console.log('🔍 Iniciando inspección de tablas reales via Neon Data API')
    
    // Verificar conexión a la API real
    const isConnected = await neonDB.testConnection()
    if (!isConnected) {
      throw new Error('No se pudo conectar a la Neon Data API')
    }

    console.log('✅ Conexión exitosa, inspeccionando tablas...')

    // Inspeccionar ambas tablas usando la API real
    const tablesData = await neonDB.inspectTables()

    return NextResponse.json({
      success: true,
      message: 'Inspección completada con datos reales',
      mode: 'real_data',
      apiUrl: 'https://app-delicate-river-89418359.dpl.myneon.app',
      tables: tablesData,
      summary: {
        totalTables: 2,
        totalRows: tablesData.table_ccm.rowCount + tablesData.table_prr.rowCount,
        connection: 'Neon Data API (PostgREST)',
        dataSource: 'Base de datos real'
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ Error en inspección real:', error)
    
    // Fallback a datos simulados si falla la API real
    console.log('🔄 Fallback a datos simulados...')
    
    return NextResponse.json({
      success: true,
      message: 'Inspección completada (fallback a simulación)',
      mode: 'simulation_fallback',
      error: error instanceof Error ? error.message : 'Error desconocido',
      tables: {
        table_ccm: {
          exists: true,
          rowCount: 1247,
          description: 'Tabla CCM (datos simulados)',
          sampleData: []
        },
        table_prr: {
          exists: true,
          rowCount: 892,
          description: 'Tabla PRR (datos simulados)',
          sampleData: []
        }
      },
      summary: {
        totalTables: 2,
        totalRows: 2139,
        connection: 'Simulación (API falló)',
        dataSource: 'Datos de ejemplo'
      },
      timestamp: new Date().toISOString()
    })
  }
} 
 
 