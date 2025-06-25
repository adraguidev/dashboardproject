import { NextResponse } from 'next/server'
import { NeonDataAPI } from '@/lib/neon-api'

export async function POST() {
  try {
    console.log('🌅 Iniciando verificación de conexión a Neon DB...')
    
    const neonDB = new NeonDataAPI()
    
    // Intentar conexión con la API de Neon
    const isConnected = await neonDB.testConnection()
    
    if (isConnected) {
      console.log('✅ Conexión a Neon DB exitosa')
      
      // Intentar una consulta simple para asegurar que la DB está activa
      try {
        const [ccmSample, prrSample] = await Promise.all([
          neonDB.getSampleCCM(1),
          neonDB.getSamplePRR(1)
        ])
        
        console.log('✅ Consultas de prueba exitosas:', {
          ccmRecords: ccmSample.length,
          prrRecords: prrSample.length
        })
        
        return NextResponse.json({
          success: true,
          message: 'Base de datos Neon está activa y respondiendo',
          timestamp: new Date().toISOString(),
          testResults: {
            connection: true,
            ccmQuery: ccmSample.length > 0,
            prrQuery: prrSample.length > 0
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
 
 