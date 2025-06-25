'use client'

import { useState, useEffect, useCallback } from 'react'
import type { IngresosReport } from '@/types/dashboard'
import { getCached, setCached } from '@/lib/frontend-cache'

interface UseIngresosOptions {
  process: 'ccm' | 'prr'
  days?: number
  autoRefresh?: boolean
  refreshInterval?: number
  enabled?: boolean
}

interface UseIngresosReturn {
  report: IngresosReport | null
  isLoading: boolean
  error: string | null
  refreshData: () => Promise<void>
  updatePeriod: (days: number) => void
}

export function useIngresos({
  process,
  days = 30,
  autoRefresh = false,
  refreshInterval = 30000, // 30 segundos
  enabled = true
}: UseIngresosOptions): UseIngresosReturn {
  const [report, setReport] = useState<IngresosReport | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentDays, setCurrentDays] = useState(days)

  const fetchData = useCallback(async () => {
    if (!enabled) return

    setIsLoading(true)
    setError(null)

    try {
      console.log(`🔍 Fetching ingresos data for ${process.toUpperCase()} (${currentDays} days)`)
      
      const cacheKey = `ingresos_${process}_${currentDays}`
      const cached = getCached<IngresosReport>(cacheKey)
      if (cached) {
        console.log('📦 Ingresos cache hit')
        setReport(cached)
        return
      }

      const response = await fetch(`/api/dashboard/ingresos?process=${process}&days=${currentDays}`)
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || 'Error desconocido del servidor')
      }

      console.log(`✅ Ingresos data fetched: ${result.report.totalTramites} trámites`)
      setReport(result.report)
      setCached(cacheKey, result.report)

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido'
      console.error('❌ Error fetching ingresos data:', errorMessage)
      setError(errorMessage)
      setReport(null)
    } finally {
      setIsLoading(false)
    }
  }, [enabled, process, currentDays])

  // Función para actualizar el período
  const updatePeriod = useCallback((newDays: number) => {
    console.log(`📅 Updating period to ${newDays} days`)
    setCurrentDays(newDays)
  }, [])

  // Función para refrescar datos manualmente
  const refreshData = useCallback(async () => {
    console.log('🔄 Manual refresh triggered')
    await fetchData()
  }, [fetchData])

  // Efecto para cargar datos iniciales y cuando cambian las dependencias
  useEffect(() => {
    if (enabled) {
      fetchData()
    }
  }, [enabled, fetchData])

  // Efecto para auto-refresh
  useEffect(() => {
    if (!autoRefresh || !enabled) return

    const interval = setInterval(() => {
      console.log(`🔄 Auto-refresh triggered (every ${refreshInterval}ms)`)
      fetchData()
    }, refreshInterval)

    return () => clearInterval(interval)
  }, [autoRefresh, refreshInterval, fetchData])

  return {
    report,
    isLoading,
    error,
    refreshData,
    updatePeriod
  }
} 