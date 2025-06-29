import { NextRequest, NextResponse } from 'next/server'
import { jobStatusManager } from '@/lib/redis'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const jobId = searchParams.get('jobId')

    if (!jobId) {
      return NextResponse.json({ error: 'jobId es requerido' }, { status: 400 })
    }

    const status = await jobStatusManager.get(jobId)

    if (!status) {
      return NextResponse.json({ error: 'Job no encontrado' }, { status: 404 })
    }

    return NextResponse.json(status, { status: 200 })

  } catch (error) {
    console.error('Error obteniendo estado del job:', error)
    return NextResponse.json(
      { 
        error: 'Error interno del servidor',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    )
  }
} 