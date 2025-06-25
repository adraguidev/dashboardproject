import { useState, useCallback, useEffect } from 'react'
import { ProduccionReportSummary } from '@/types/dashboard'

interface UseProduccionReportOptions {
  process: 'ccm' | 'prr'
  autoRefresh?: boolean
  refreshInterval?: number // en milisegundos
}

export function useProduccionReport({
  process,
  autoRefresh = false,
  refreshInterval = 60000 // 1 minuto por defecto
}: UseProduccionReportOptions) {
  const [report, setReport] = useState<ProduccionReportSummary | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchReport = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      console.log(`🏭 Fetching producción report: ${process.toUpperCase()}`)

      const response = await fetch(`/api/dashboard/produccion-report?process=${process}`)
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`)
      }

      const result: { 
        success: boolean; 
        report: ProduccionReportSummary; 
        meta: any; 
        error?: string 
      } = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Error desconocido')
      }

      setReport(result.report)

      console.log(`✅ Reporte de producción cargado: ${result.report.data.length} operadores, ${result.report.grandTotal} total`)

    } catch (err) {
      console.error('❌ Error fetching producción report:', err)
      setError(err instanceof Error ? err.message : 'Error desconocido')
      setReport(null)
    } finally {
      setLoading(false)
    }
  }, [process])

  // Cargar datos iniciales y recargar cuando cambia el proceso
  useEffect(() => {
    fetchReport()
  }, [fetchReport])

  // Auto-refresh si está habilitado
  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(() => {
      fetchReport()
    }, refreshInterval)

    return () => clearInterval(interval)
  }, [fetchReport, autoRefresh, refreshInterval])

  return {
    report,
    loading,
    error,
    refetch: fetchReport
  }
} 