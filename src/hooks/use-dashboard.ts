'use client'

import { useState, useEffect } from 'react'
import { KPI, Process, DashboardConfig } from '@/types/dashboard'
import { sampleKPIs, sampleProcesses } from '@/data/sample-data'

export function useDashboard() {
  const [kpis, setKpis] = useState<KPI[]>([])
  const [processes, setProcesses] = useState<Process[]>([])
  const [selectedProcessId, setSelectedProcessId] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Simular carga de datos
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true)
        
        // Simular delay de red
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        setKpis(sampleKPIs)
        setProcesses(sampleProcesses)
        setSelectedProcessId(sampleProcesses[0]?.id || '')
        
      } catch (err) {
        setError('Error al cargar los datos del dashboard')
        console.error('Dashboard error:', err)
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [])

  const filteredKpis = selectedProcessId 
    ? kpis.filter(kpi => {
        const process = processes.find(p => p.id === selectedProcessId)
        return process?.metrics.some(m => m.category === kpi.category)
      })
    : kpis

  const selectedProcess = processes.find(p => p.id === selectedProcessId)

  const refreshData = async () => {
    setIsLoading(true)
    // Simular refresh
    await new Promise(resolve => setTimeout(resolve, 500))
    setIsLoading(false)
  }

  const selectProcess = (processId: string) => {
    setSelectedProcessId(processId)
  }

  return {
    kpis: filteredKpis,
    processes,
    selectedProcessId,
    selectedProcess,
    isLoading,
    error,
    selectProcess,
    refreshData
  }
} 
 
 