import { NextResponse } from 'next/server'
import { wakeUpNeonDatabase } from '@/lib/prisma'

export async function POST() {
  try {
    console.log('🌅 Iniciando proceso de activación de Neon...')
    
    const isAwake = await wakeUpNeonDatabase()
    
    if (isAwake) {
      return NextResponse.json({
        success: true,
        message: 'Base de datos Neon activada correctamente',
        timestamp: new Date().toISOString(),
        database: 'neon-postgresql'
      })
    } else {
      return NextResponse.json({
        success: false,
        message: 'No se pudo activar la base de datos Neon',
        timestamp: new Date().toISOString(),
        database: 'mock-data',
        reason: 'Timeout o problemas de conectividad'
      }, { status: 408 }) // Request Timeout
    }
  } catch (error) {
    console.error('❌ Error al despertar la base de datos:', error)
    
    return NextResponse.json({
      success: false,
      message: 'Error interno al intentar activar la base de datos',
      timestamp: new Date().toISOString(),
      database: 'mock-data',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 
 
 