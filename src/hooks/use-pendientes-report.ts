'use client'

import { useState, useEffect, useCallback } from 'react'
import { PendientesReportSummary } from '@/types/dashboard'
import { getCached, setCached } from '@/lib/frontend-cache'

interface UsePendientesReportOptions {
  process: 'ccm' | 'prr'
  groupBy: 'year' | 'quarter' | 'month'
  enabled: boolean
  backgroundFetch?: boolean
  backgroundFetchInterval?: number
}

interface UsePendientesReportReturn {
  report: PendientesReportSummary | null
  loading: boolean
  error: string | null
  changeGrouping: (newGroupBy: 'year' | 'quarter' | 'month') => void
  groupBy: 'year' | 'quarter' | 'month'
}

export function usePendientesReport({
  process,
  groupBy: initialGroupBy,
  enabled,
  backgroundFetch = false,
  backgroundFetchInterval = 6 * 60 * 1000, // 6 minutos
}: UsePendientesReportOptions): UsePendientesReportReturn {
  const [report, setReport] = useState<PendientesReportSummary | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [groupBy, setGroupBy] = useState<'year' | 'quarter' | 'month'>('year')

  const fetchReport = useCallback(async ({ isBackground = false } = {}) => {
    if (!enabled && !isBackground) return

    if (!isBackground) {
      setLoading(true)
    }
    setError(null)

    try {
      const cacheKey = `pendientes_${process}_${groupBy}`
      const cached = getCached<PendientesReportSummary>(cacheKey)
      if (cached) {
        setReport(cached)
        if (!isBackground) setLoading(false)
        return
      }

      const response = await fetch(`/api/dashboard/pendientes-report?process=${process}&groupBy=${groupBy}`)
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`)
      }

      const result: { 
        success: boolean; 
        report: PendientesReportSummary; 
        meta: any; 
        error?: string 
      } = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Error desconocido')
      }

      setReport(result.report)
      setCached(cacheKey, result.report)

      // Report loaded successfully
    } catch (err) {
      if (!isBackground) {
        setError(err instanceof Error ? err.message : 'Error desconocido')
      }
      console.error(`❌ Error fetching pendientes report (${isBackground ? 'background' : 'foreground'}):`, err)
    } finally {
      if (!isBackground) {
        setLoading(false)
      }
    }
  }, [process, groupBy, enabled])

  const changeGrouping = (newGroupBy: 'year' | 'quarter' | 'month') => {
    setGroupBy(newGroupBy)
  }

  // Efecto para carga en PRIMER PLANO
  useEffect(() => {
    if (enabled) {
      fetchReport({ isBackground: false })
    }
  }, [enabled, fetchReport])

  // Efecto para carga en SEGUNDO PLANO
  useEffect(() => {
    if (enabled || !backgroundFetch) return

    let intervalId: NodeJS.Timeout
    const initialDelay = Math.random() * 9000 // 0-9 segundos

    const timeoutId = setTimeout(() => {
      console.log(`[Background] Pre-cargando datos para: Pendientes ${process.toUpperCase()}`)
      fetchReport({ isBackground: true })

      intervalId = setInterval(() => {
        console.log(`[Background] Refrescando datos para: Pendientes ${process.toUpperCase()}`)
        fetchReport({ isBackground: true })
      }, backgroundFetchInterval)
    }, initialDelay)

    return () => {
      clearTimeout(timeoutId)
      if (intervalId) clearInterval(intervalId)
    }
  }, [enabled, backgroundFetch, process, backgroundFetchInterval, fetchReport])

  return {
    report,
    loading,
    error,
    changeGrouping,
    groupBy
  }
} 
 
 