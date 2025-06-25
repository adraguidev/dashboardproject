'use client'

import { useState, useEffect, useCallback } from 'react'
import { PendientesReportSummary } from '@/types/dashboard'
import { getCached, setCached } from '@/lib/frontend-cache'

interface UsePendientesReportOptions {
  process: 'ccm' | 'prr'
  autoRefresh?: boolean
  refreshInterval?: number
  enabled?: boolean
}

export function usePendientesReport({
  process,
  autoRefresh = false,
  refreshInterval = 60000, // 1 minuto por defecto
  enabled = true
}: UsePendientesReportOptions) {
  const [report, setReport] = useState<PendientesReportSummary | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [groupBy, setGroupBy] = useState<'quarter' | 'month' | 'year'>('year')

  const fetchReport = useCallback(async () => {
    if (!enabled) return

    setLoading(true)
    setError(null)

    try {
      console.log(`🔍 Fetching pendientes report: ${process.toUpperCase()} grouped by ${groupBy}`)

      const cacheKey = `pendientes_${process}_${groupBy}`
      const cached = getCached<PendientesReportSummary>(cacheKey)
      if (cached) {
        console.log('📦 Pendientes cache hit')
        setReport(cached)
      } else {
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

        console.log(`✅ Reporte cargado: ${result.report.data.length} operadores, ${result.report.grandTotal} total pendientes`)
      }

    } catch (err) {
      console.error('❌ Error fetching pendientes report:', err)
      setError(err instanceof Error ? err.message : 'Error desconocido')
      setReport(null)
    } finally {
      setLoading(false)
    }
  }, [enabled, process, groupBy])

  const changeGrouping = (newGroupBy: 'quarter' | 'month' | 'year') => {
    setGroupBy(newGroupBy)
  }

  // Cargar datos iniciales y recargar cuando cambia el proceso o el agrupamiento
  useEffect(() => {
    if (enabled) {
      fetchReport()
    }
  }, [enabled, fetchReport])

  // Auto-refresh si está habilitado
  useEffect(() => {
    if (!autoRefresh || !enabled) return

    const interval = setInterval(() => {
      console.log(`🔄 Auto-refresh pendientes report ${process.toUpperCase()} with grouping ${groupBy}`)
      fetchReport()
    }, refreshInterval)

    return () => clearInterval(interval)
  }, [autoRefresh, refreshInterval, fetchReport, process, groupBy, enabled])

  return {
    // Data
    report,
    groupBy,
    
    // State
    loading,
    error,
    
    // Actions
    refresh: fetchReport,
    changeGrouping,
    
    // Stats
    stats: report ? {
      totalOperators: report.data.length,
      totalPendientes: report.grandTotal,
      yearsSpan: report.years,
      topOperator: report.data[0]?.operador || null,
      topOperatorCount: report.data[0]?.total || 0,
      hasData: report.data.length > 0
    } : {
      totalOperators: 0,
      totalPendientes: 0,
      yearsSpan: [],
      topOperator: null,
      topOperatorCount: 0,
      hasData: false
    }
  }
} 
 
 