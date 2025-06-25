'use server'

import { prisma, checkDatabaseConnection } from '@/lib/prisma'
import { KPI, Process, Metric } from '@/types/dashboard'
import { sampleKPIs, sampleProcesses } from '@/data/sample-data'

export class DashboardService {
  // Verificar si hay conexión a BD
  static async isDatabaseAvailable(): Promise<boolean> {
    return await checkDatabaseConnection()
  }

  // Obtener todos los KPIs
  static async getKPIs(): Promise<KPI[]> {
    try {
      const isDbAvailable = await this.isDatabaseAvailable()
      
      if (!isDbAvailable) {
        console.warn('Database not available, using sample data')
        return sampleKPIs
      }

      const metrics = await prisma.metric.findMany({
        include: {
          process: true
        },
        orderBy: {
          recordedAt: 'desc'
        }
      })

      // Convertir métricas de DB a KPIs para el dashboard
      return metrics.map(metric => this.convertMetricToKPI(metric))
    } catch (error) {
      console.error('Error fetching KPIs:', error)
      console.warn('Fallback to sample data')
      return sampleKPIs
    }
  }

  // Obtener procesos
  static async getProcesses(): Promise<Process[]> {
    try {
      const isDbAvailable = await this.isDatabaseAvailable()
      
      if (!isDbAvailable) {
        console.warn('Database not available, using sample data')
        return sampleProcesses
      }

      const processes = await prisma.process.findMany({
        include: {
          metrics: {
            orderBy: {
              recordedAt: 'desc'
            }
          },
          owner: true
        }
      })

      return processes.map((process: any) => ({
        id: process.id,
        name: process.name,
        description: process.description || undefined,
        status: process.status.toLowerCase() as 'active' | 'inactive' | 'maintenance',
        owner: process.owner.name,
        metrics: process.metrics.map((m: any) => ({
          id: m.id,
          name: m.name,
          value: m.value,
          target: m.target,
          unit: m.unit,
          category: m.category,
          recordedAt: m.recordedAt
        })),
        lastUpdated: process.updatedAt
      }))
    } catch (error) {
      console.error('Error fetching processes:', error)
      console.warn('Fallback to sample data')
      return sampleProcesses
    }
  }

  // Obtener KPIs por proceso
  static async getKPIsByProcess(processId: string): Promise<KPI[]> {
    try {
      const isDbAvailable = await this.isDatabaseAvailable()
      
      if (!isDbAvailable) {
        // Filtrar datos de ejemplo por proceso
        const process = sampleProcesses.find(p => p.id === processId)
        if (!process) return []
        
        return sampleKPIs.filter(kpi => 
          process.metrics.some(m => m.category === kpi.category)
        )
      }

      const metrics = await prisma.metric.findMany({
        where: {
          processId: processId
        },
        include: {
          process: true
        },
        orderBy: {
          recordedAt: 'desc'
        }
      })

      return metrics.map(metric => this.convertMetricToKPI(metric))
    } catch (error) {
      console.error('Error fetching KPIs by process:', error)
      return []
    }
  }

  // Crear nuevo proceso
  static async createProcess(data: {
    name: string
    description?: string
    ownerId: string
  }) {
    try {
      const isDbAvailable = await this.isDatabaseAvailable()
      
      if (!isDbAvailable) {
        throw new Error('Base de datos no disponible')
      }

      return await prisma.process.create({
        data: {
          name: data.name,
          description: data.description,
          ownerId: data.ownerId,
          status: 'ACTIVE'
        }
      })
    } catch (error) {
      console.error('Error creating process:', error)
      throw error
    }
  }

  // Agregar métrica a proceso
  static async addMetric(data: {
    name: string
    value: number
    target?: number
    unit?: string
    category: string
    processId: string
  }) {
    try {
      const isDbAvailable = await this.isDatabaseAvailable()
      
      if (!isDbAvailable) {
        throw new Error('Base de datos no disponible')
      }

      return await prisma.metric.create({
        data: {
          name: data.name,
          value: data.value,
          target: data.target,
          unit: data.unit,
          category: data.category,
          processId: data.processId
        }
      })
    } catch (error) {
      console.error('Error adding metric:', error)
      throw error
    }
  }

  // Métodos privados para conversión de datos
  private static convertMetricToKPI(metric: any): KPI {
    // Calcular tendencia basada en métricas históricas (simplificado)
    const trend = this.calculateTrend(metric.value, metric.target)
    
    return {
      id: metric.id,
      name: metric.name,
      value: metric.value,
      target: metric.target,
      unit: metric.unit,
      trend: trend.direction,
      change: trend.percentage,
      category: metric.category
    }
  }

  private static calculateTrend(current: number, target?: number): {
    direction: 'up' | 'down' | 'stable'
    percentage: number
  } {
    if (!target) {
      return { direction: 'stable', percentage: 0 }
    }

    const difference = current - target
    const percentage = Math.abs((difference / target) * 100)
    
    if (difference > 0) {
      return { direction: 'up', percentage }
    } else if (difference < 0) {
      return { direction: 'down', percentage }
    } else {
      return { direction: 'stable', percentage: 0 }
    }
  }
} 
 
 