'use client'

import { useState, useEffect } from 'react'
import { PendientesReportSummary } from '@/types/dashboard'

interface UsePendientesReportOptions {
  process: 'ccm' | 'prr'
  autoRefresh?: boolean
  refreshInterval?: number
}

export function usePendientesReport({
  process,
  autoRefresh = false,
  refreshInterval = 60000 // 1 minuto por defecto
}: UsePendientesReportOptions) {
  const [report, setReport] = useState<PendientesReportSummary | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchReport = async () => {
    setLoading(true)
    setError(null)

    try {
      console.log(`🔍 Fetching pendientes report: ${process.toUpperCase()}`)

      const response = await fetch(`/api/dashboard/pendientes-report?process=${process}`)
      
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

      console.log(`✅ Reporte cargado: ${result.report.data.length} operadores, ${result.report.grandTotal} total pendientes`)

    } catch (err) {
      console.error('❌ Error fetching pendientes report:', err)
      setError(err instanceof Error ? err.message : 'Error desconocido')
      setReport(null)
    } finally {
      setLoading(false)
    }
  }

  const refresh = () => {
    fetchReport()
  }

  // Cargar datos iniciales
  useEffect(() => {
    fetchReport()
  }, [process])

  // Auto-refresh si está habilitado
  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(() => {
      console.log(`🔄 Auto-refresh pendientes report ${process.toUpperCase()}`)
      fetchReport()
    }, refreshInterval)

    return () => clearInterval(interval)
  }, [autoRefresh, refreshInterval, process])

  return {
    // Data
    report,
    
    // State
    loading,
    error,
    
    // Actions
    refresh,
    
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
 
 