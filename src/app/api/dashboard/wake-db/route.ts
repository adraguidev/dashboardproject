import { NextResponse } from 'next/server'

export async function POST() {
  try {
    console.log('🌅 Wake DB endpoint called - pero ya no tenemos Prisma')
    
    return NextResponse.json({
      success: true,
      message: 'El proyecto ahora usa Neon API directamente, no necesita despertar BD',
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ Error en wake-db:', error)
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Error interno del servidor',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    )
  }
} 
 
 