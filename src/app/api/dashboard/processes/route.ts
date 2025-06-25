import { NextResponse } from 'next/server'
import { sampleProcesses } from '@/data/sample-data'

export async function GET() {
  try {
    // Por ahora usar datos de ejemplo hasta que la BD esté conectada
    // const processes = await DashboardService.getProcesses()
    const processes = sampleProcesses
    
    return NextResponse.json(processes)
  } catch (error) {
    console.error('Error fetching processes:', error)
    return NextResponse.json(
      { error: 'Error al obtener los procesos' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json()
    
    // Validación básica
    if (!data.name || !data.ownerId) {
      return NextResponse.json(
        { error: 'Nombre y propietario son requeridos' },
        { status: 400 }
      )
    }

    // Por ahora retornar mock hasta que la BD esté conectada
    // const newProcess = await DashboardService.createProcess(data)
    const newProcess = {
      id: `new-${Date.now()}`,
      name: data.name,
      description: data.description,
      status: 'active' as const,
      owner: 'Usuario Mock',
      metrics: [],
      lastUpdated: new Date()
    }
    
    return NextResponse.json(newProcess, { status: 201 })
  } catch (error) {
    console.error('Error creating process:', error)
    return NextResponse.json(
      { error: 'Error al crear el proceso' },
      { status: 500 }
    )
  }
} 
 
 