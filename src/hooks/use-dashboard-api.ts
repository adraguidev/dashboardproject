'use client'

import { useState, useEffect } from 'react'
import { KPI, Process } from '@/types/dashboard'

export function useDashboardAPI() {
  const [kpis, setKpis] = useState<KPI[]>([])
  const [processes, setProcesses] = useState<Process[]>([])
  const [selectedProcessId, setSelectedProcessId] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Cargar datos iniciales
  useEffect(() => {
    loadInitialData()
  }, [])

  const loadInitialData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const [kpisResponse, processesResponse] = await Promise.all([
        fetch('/api/dashboard/kpis'),
        fetch('/api/dashboard/processes')
      ])

      if (!kpisResponse.ok || !processesResponse.ok) {
        throw new Error('Error al cargar los datos')
      }

      const kpisData = await kpisResponse.json()
      const processesData = await processesResponse.json()

      // Convertir fechas de string a Date
      const processesWithDates = processesData.map((process: any) => ({
        ...process,
        lastUpdated: new Date(process.lastUpdated),
        metrics: process.metrics.map((metric: any) => ({
          ...metric,
          recordedAt: new Date(metric.recordedAt)
        }))
      }))

      setKpis(kpisData)
      setProcesses(processesWithDates)
      setSelectedProcessId(processesData[0]?.id || '')
      
    } catch (err) {
      setError('Error al cargar los datos del dashboard')
      console.error('Dashboard API error:', err)
    } finally {
      setLoading(false)
    }
  }

  // Filtrar KPIs por proceso seleccionado
  const filteredKpis = selectedProcessId 
    ? kpis.filter(kpi => {
        const process = processes.find(p => p.id === selectedProcessId)
        return process?.metrics.some(m => m.category === kpi.category)
      })
    : kpis

  // Obtener proceso seleccionado
  const selectedProcess = processes.find(p => p.id === selectedProcessId)

  // Refrescar datos
  const refreshData = async () => {
    await loadInitialData()
  }

  // Crear nuevo proceso
  const createProcess = async (data: {
    name: string
    description?: string
    ownerId: string
  }) => {
    try {
      const response = await fetch('/api/dashboard/processes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        throw new Error('Error al crear el proceso')
      }

      const newProcess = await response.json()
      setProcesses(prev => [...prev, newProcess])
      return newProcess
    } catch (error) {
      console.error('Error creating process:', error)
      throw error
    }
  }

  // Filtrar KPIs por categoría
  const getKPIsByCategory = (category: string) => {
    return kpis.filter(kpi => kpi.category === category)
  }

  // Obtener resumen de métricas
  const getMetricsSummary = () => {
    const totalKpis = kpis.length
    const positiveKpis = kpis.filter(kpi => kpi.trend === 'up').length
    const negativeKpis = kpis.filter(kpi => kpi.trend === 'down').length
    const stableKpis = kpis.filter(kpi => kpi.trend === 'stable').length

    return {
      total: totalKpis,
      positive: positiveKpis,
      negative: negativeKpis,
      stable: stableKpis,
      positivePercentage: totalKpis > 0 ? (positiveKpis / totalKpis) * 100 : 0
    }
  }

  return {
    // Datos
    kpis: filteredKpis,
    allKpis: kpis,
    processes,
    selectedProcessId,
    selectedProcess,
    
    // Estados
    loading,
    error,
    
    // Acciones
    setSelectedProcessId,
    refreshData,
    createProcess,
    
    // Utilidades
    getKPIsByCategory,
    getMetricsSummary,
  }
} 
 
 