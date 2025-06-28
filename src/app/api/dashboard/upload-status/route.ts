import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'

export async function GET(request: NextRequest) {
  try {
    // Verificar estado general de las tablas
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