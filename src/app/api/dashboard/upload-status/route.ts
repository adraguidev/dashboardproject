import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'

// Simple storage para el estado de procesamiento (en producción usar Redis o DB)
const processingStatus = new Map<string, {
  status: 'processing' | 'completed' | 'error',
  startTime: number,
  message?: string,
  details?: any
}>()

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const jobId = searchParams.get('jobId')
    
    if (jobId && processingStatus.has(jobId)) {
      const status = processingStatus.get(jobId)!
      return NextResponse.json({
        success: true,
        ...status,
        elapsed: Date.now() - status.startTime
      })
    }

    // Si no hay jobId específico, verificar estado general de las tablas
    // Esto es útil para detectar cuándo hay datos nuevos
    if (!process.env.DATABASE_DIRECT_URL) {
      return NextResponse.json({ 
        error: 'Database URL no configurada' 
      }, { status: 500 })
    }

    const sql = neon(process.env.DATABASE_DIRECT_URL)
    
    // Verificar última actualización de las tablas
    const [ccmCount, prrCount] = await Promise.all([
      sql`SELECT COUNT(*) as count FROM table_ccm`.then(r => r[0]?.count || 0),
      sql`SELECT COUNT(*) as count FROM table_prr`.then(r => r[0]?.count || 0)
    ])

    return NextResponse.json({
      success: true,
      status: 'ready',
      tables: {
        ccm: parseInt(ccmCount as string),
        prr: parseInt(prrCount as string)
      },
      lastChecked: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error verificando estado:', error)
    return NextResponse.json({ 
      error: 'Error al verificar estado',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 })
  }
}

// Función helper para actualizar estado (usar desde processFilesInBackground)
export function updateProcessingStatus(jobId: string, status: any) {
  processingStatus.set(jobId, {
    ...status,
    startTime: status.startTime || Date.now()
  })
  
  // Limpiar estados antiguos (más de 1 hora)
  for (const [id, data] of processingStatus.entries()) {
    if (Date.now() - data.startTime > 60 * 60 * 1000) {
      processingStatus.delete(id)
    }
  }
} 