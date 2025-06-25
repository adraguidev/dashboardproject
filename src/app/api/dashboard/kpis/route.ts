import { NextResponse } from 'next/server'
import { DashboardService } from '@/services/dashboard-service'
import { sampleKPIs } from '@/data/sample-data'

export async function GET() {
  try {
    // Por ahora usar datos de ejemplo hasta que la BD esté conectada
    // const kpis = await DashboardService.getKPIs()
    const kpis = sampleKPIs
    
    return NextResponse.json(kpis)
  } catch (error) {
    console.error('Error fetching KPIs:', error)
    return NextResponse.json(
      { error: 'Error al obtener los KPIs' },
      { status: 500 }
    )
  }
} 
 
 