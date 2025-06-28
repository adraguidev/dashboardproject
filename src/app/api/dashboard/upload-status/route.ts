import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import { jobStatusManager } from '@/lib/redis'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const jobId = searchParams.get('jobId')

  if (!jobId) {
    return NextResponse.json({ error: 'Falta el ID del trabajo (jobId).' }, { status: 400 })
  }

  try {
    const status = await jobStatusManager.get(jobId)
    
    if (!status) {
      return NextResponse.json({ jobId, status: 'not_found', message: 'El trabajo no se encontró o ha expirado.' }, { status: 404 })
    }

    return NextResponse.json({ jobId, ...status })

  } catch (error) {
    console.error(`[Status] Error obteniendo el estado para el trabajo ${jobId}:`, error)
    return NextResponse.json({ error: 'Error interno al obtener el estado del trabajo.' }, { status: 500 })
  }
} 