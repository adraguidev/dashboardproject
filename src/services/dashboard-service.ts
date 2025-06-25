'use server'

import { KPI, Process } from '@/types/dashboard'
import { sampleKPIs, sampleProcesses } from '@/data/sample-data'

export class DashboardService {
  
  // Obtener todos los KPIs (usando solo datos de ejemplo)
  static async getKPIs(): Promise<KPI[]> {
    console.log('Using sample KPIs data')
    return sampleKPIs
  }

  // Obtener procesos (usando solo datos de ejemplo)
  static async getProcesses(): Promise<Process[]> {
    console.log('Using sample processes data')
    return sampleProcesses
  }

  // Obtener KPIs por proceso (usando solo datos de ejemplo)
  static async getKPIsByProcess(processId: string): Promise<KPI[]> {
    // Filtrar datos de ejemplo por proceso
    const process = sampleProcesses.find(p => p.id === processId)
    if (!process) return []
    
    return sampleKPIs.filter(kpi => 
      process.metrics.some(m => m.category === kpi.category)
    )
  }

  // Métodos privados para conversión de datos
  private static calculateTrend(current: number, target?: number): {
    direction: 'up' | 'down' | 'stable'
    percentage: number
  } {
    if (!target) {
      return { direction: 'stable', percentage: 0 }
    }

    const difference = current - target
    const percentageChange = (difference / target) * 100

    if (Math.abs(percentageChange) < 1) {
      return { direction: 'stable', percentage: 0 }
    }

    return {
      direction: percentageChange > 0 ? 'up' : 'down',
      percentage: Math.abs(percentageChange)
    }
  }
} 
 
 