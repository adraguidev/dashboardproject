import { NextResponse } from 'next/server'
import { createDirectDatabaseAPI } from '@/lib/db'

export async function POST() {
  try {
    console.log('🌅 Iniciando verificación de conexión directa a PostgreSQL...')
    
    const dbAPI = await createDirectDatabaseAPI()
    
    // Intentar conexión directa a PostgreSQL
    const isConnected = await dbAPI.testConnection()
    
    if (isConnected) {
      console.log('✅ Conexión directa a PostgreSQL exitosa')
      
      // Intentar una consulta simple para asegurar que la DB está activa
      try {
        const tables = await dbAPI.inspectTables()
        
        console.log('✅ Consultas de prueba exitosas:', {
          ccmRecords: tables.table_ccm.rowCount,
          prrRecords: tables.table_prr.rowCount
        })
        
        return NextResponse.json({
          success: true,
          message: 'Base de datos PostgreSQL está activa y respondiendo',
          timestamp: new Date().toISOString(),
          testResults: {
            connection: true,
            ccmQuery: tables.table_ccm.rowCount > 0,
            prrQuery: tables.table_prr.rowCount > 0,
            tables: tables
          }
        })
        
      } catch (queryError) {
        console.warn('⚠️ Conexión OK pero consultas fallaron:', queryError)
        
        return NextResponse.json({
          success: true,
          message: 'Conexión establecida, base de datos despertando...',
          timestamp: new Date().toISOString(),
          testResults: {
            connection: true,
            queries: false,
            details: queryError instanceof Error ? queryError.message : 'Error en consultas'
          }
        })
      }
      
    } else {
      console.error('❌ No se pudo conectar a Neon DB')
      
      return NextResponse.json(
        { 
          success: false,
          message: 'No se pudo establecer conexión con la base de datos',
          timestamp: new Date().toISOString(),
          testResults: {
            connection: false
          }
        },
        { status: 503 }
      )
    }

  } catch (error) {
    console.error('❌ Error en wake-db:', error)
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Error interno del servidor',
        details: error instanceof Error ? error.message : 'Error desconocido',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
} 

export async function GET() {
  // Permitir GET también para facilitar el testing
  return POST()
} 
 
 