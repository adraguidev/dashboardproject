import { NextResponse } from 'next/server'

export async function GET() {
  try {
    console.log('🔍 Verificando estado de la base de datos (modo simulación)...')
    
    // Verificar si tenemos las credenciales básicas
    const projectId = process.env.NEXT_PUBLIC_STACK_PROJECT_ID
    const apiKey = process.env.STACK_SECRET_SERVER_KEY
    const dbUrl = process.env.DATABASE_URL
    
    // Simular un delay de verificación
    await new Promise(resolve => setTimeout(resolve, 500))
    
    if (projectId && apiKey && dbUrl) {
      return NextResponse.json({
        connected: true,
        timestamp: new Date().toISOString(),
        database: 'bdmigra (simulación)',
        method: 'Simulación con credenciales configuradas',
        mode: 'simulation',
        credentials: {
          projectId: projectId.substring(0, 8) + '...',
          hasApiKey: !!apiKey,
          hasDbUrl: !!dbUrl
        }
      })
    } else {
      return NextResponse.json({
        connected: false,
        timestamp: new Date().toISOString(),
        database: 'mock-data',
        method: 'Fallback a datos de ejemplo',
        mode: 'fallback',
        missing: {
          projectId: !projectId,
          apiKey: !apiKey,
          dbUrl: !dbUrl
        }
      })
    }
    
  } catch (error) {
    console.error('❌ Error verificando BD:', error)
    
    return NextResponse.json({
      connected: false,
      timestamp: new Date().toISOString(),
      database: 'mock-data',
      method: 'Error fallback',
      mode: 'error',
      error: error instanceof Error ? error.message : 'Error desconocido'
    })
  }
} 
 
 