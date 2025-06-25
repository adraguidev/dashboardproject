import { useState, useCallback, useEffect } from 'react'
import { ProduccionReportSummary, Evaluador } from '@/types/dashboard'
import { getCached, setCached } from '@/lib/frontend-cache'

interface UseProduccionReportOptions {
  process: 'ccm' | 'prr'
  days?: number
  dayType?: 'TODOS' | 'LABORABLES' | 'FIN_DE_SEMANA'
  autoRefresh?: boolean
  refreshInterval?: number // en milisegundos
  enabled?: boolean // nuevo flag para controlar si se debe hacer fetch
}

interface UseProduccionReportResult {
  report: ProduccionReportSummary | null
  otherProcessEvaluadores: Evaluador[]
  loading: boolean
  error: string | null
  refetch: (newDays?: number, newDayType?: 'TODOS' | 'LABORABLES' | 'FIN_DE_SEMANA') => Promise<void>
}

export function useProduccionReport({
  process,
  days = 20,
  dayType = 'TODOS',
  autoRefresh = false,
  refreshInterval = 60000, // 1 minuto por defecto
  enabled = true
}: UseProduccionReportOptions): UseProduccionReportResult {
  const [report, setReport] = useState<ProduccionReportSummary | null>(null)
  const [otherProcessEvaluadores, setOtherProcessEvaluadores] = useState<Evaluador[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentDays, setCurrentDays] = useState(days)
  const [currentDayType, setCurrentDayType] = useState(dayType)

  const fetchReport = useCallback(async () => {
    if (!enabled) return

    setLoading(true)
    setError(null)

    try {
      const cacheKey = `produccion_${process}_${currentDays}_${currentDayType}`
      const cached = getCached<ProduccionReportSummary>(cacheKey)
      if (cached) {
        console.log('📦 Producción cache hit')
        setReport(cached)
      } else {
        console.log(`🏭 Fetching producción report: ${process.toUpperCase()}`)

        // Obtener reporte de producción
        const reportResponse = await fetch(`/api/dashboard/produccion-report?process=${process}&days=${currentDays}&dayType=${currentDayType}`)
        
        if (!reportResponse.ok) {
          throw new Error(`Error ${reportResponse.status}: ${reportResponse.statusText}`)
        }

        const reportResult: { 
          success: boolean; 
          report: ProduccionReportSummary; 
          meta: any; 
          error?: string 
        } = await reportResponse.json()

        if (!reportResult.success) {
          throw new Error(reportResult.error || 'Error desconocido')
        }

        setReport(reportResult.report)
        setCached(cacheKey, reportResult.report)

        // Obtener evaluadores del proceso contrario
        const otherProcess = process === 'ccm' ? 'prr' : 'ccm'
        console.log(`📋 Fetching evaluadores from other process: ${otherProcess.toUpperCase()}`)

        const evaluadoresResponse = await fetch(`/api/dashboard/evaluadores?process=${otherProcess}`)
        
        if (evaluadoresResponse.ok) {
          const evaluadoresResult: { 
            success: boolean; 
            evaluadores: Evaluador[]; 
            error?: string 
          } = await evaluadoresResponse.json()

          if (evaluadoresResult.success) {
            setOtherProcessEvaluadores(evaluadoresResult.evaluadores || [])
            console.log(`✅ Evaluadores del proceso contrario cargados: ${evaluadoresResult.evaluadores?.length || 0}`)
          } else {
            console.warn('⚠️ No se pudieron cargar evaluadores del proceso contrario:', evaluadoresResult.error)
            setOtherProcessEvaluadores([])
          }
        } else {
          console.warn('⚠️ Error al obtener evaluadores del proceso contrario')
          setOtherProcessEvaluadores([])
        }

        console.log(`✅ Reporte de producción cargado: ${reportResult.report.data.length} operadores, ${reportResult.report.grandTotal} total`)

      }
    } catch (err) {
      console.error('❌ Error fetching producción report:', err)
      setError(err instanceof Error ? err.message : 'Error desconocido')
      setReport(null)
      setOtherProcessEvaluadores([])
    } finally {
      setLoading(false)
    }
  }, [enabled, process, currentDays, currentDayType])

  const refetch = useCallback(async (newDays?: number, newDayType?: 'TODOS' | 'LABORABLES' | 'FIN_DE_SEMANA') => {
    if (newDays !== undefined) setCurrentDays(newDays)
    if (newDayType !== undefined) setCurrentDayType(newDayType)
    
    // Crear una nueva llamada con los parámetros actualizados
    setLoading(true)
    setError(null)

    try {
      const finalDays = newDays !== undefined ? newDays : currentDays
      const finalDayType = newDayType !== undefined ? newDayType : currentDayType
      
      console.log(`🏭 Fetching producción report: ${process.toUpperCase()} - ${finalDays} días, tipo: ${finalDayType}`)

      const cacheKey2 = `produccion_${process}_${finalDays}_${finalDayType}`
      const cached2 = getCached<ProduccionReportSummary>(cacheKey2)
      if (cached2) {
        console.log('📦 Producción cache hit (refetch)')
        setReport(cached2)
        setLoading(false)
        return
      }

      const reportResponse = await fetch(`/api/dashboard/produccion-report?process=${process}&days=${finalDays}&dayType=${finalDayType}`)
      
      if (!reportResponse.ok) {
        throw new Error(`Error ${reportResponse.status}: ${reportResponse.statusText}`)
      }

      const reportResult: { 
        success: boolean; 
        report: ProduccionReportSummary; 
        meta: any; 
        error?: string 
      } = await reportResponse.json()

      if (!reportResult.success) {
        throw new Error(reportResult.error || 'Error desconocido')
      }

      setReport(reportResult.report)
      setCached(cacheKey2, reportResult.report)

      // Obtener evaluadores del proceso contrario (estos no cambian con los filtros)
      const otherProcess = process === 'ccm' ? 'prr' : 'ccm'
      console.log(`📋 Fetching evaluadores from other process: ${otherProcess.toUpperCase()}`)

      const evaluadoresResponse = await fetch(`/api/dashboard/evaluadores?process=${otherProcess}`)
      
      if (evaluadoresResponse.ok) {
        const evaluadoresResult: { 
          success: boolean; 
          evaluadores: Evaluador[]; 
          error?: string 
        } = await evaluadoresResponse.json()

        if (evaluadoresResult.success) {
          setOtherProcessEvaluadores(evaluadoresResult.evaluadores || [])
          console.log(`✅ Evaluadores del proceso contrario cargados: ${evaluadoresResult.evaluadores?.length || 0}`)
        } else {
          console.warn('⚠️ No se pudieron cargar evaluadores del proceso contrario:', evaluadoresResult.error)
          setOtherProcessEvaluadores([])
        }
      } else {
        console.warn('⚠️ Error al obtener evaluadores del proceso contrario')
        setOtherProcessEvaluadores([])
      }

      console.log(`✅ Reporte de producción cargado: ${reportResult.report.data.length} operadores, ${reportResult.report.grandTotal} total`)

    } catch (err) {
      console.error('❌ Error fetching producción report:', err)
      setError(err instanceof Error ? err.message : 'Error desconocido')
      setReport(null)
      setOtherProcessEvaluadores([])
    } finally {
      setLoading(false)
    }
  }, [process, currentDays, currentDayType])

  // Cargar datos iniciales y recargar cuando cambia el proceso
  useEffect(() => {
    if (enabled) {
      fetchReport()
    }
  }, [enabled, fetchReport])

  // Auto-refresh si está habilitado
  useEffect(() => {
    if (!autoRefresh || !enabled) return

    const interval = setInterval(() => {
      fetchReport()
    }, refreshInterval)

    return () => clearInterval(interval)
  }, [fetchReport, autoRefresh, refreshInterval])

  return {
    report,
    otherProcessEvaluadores,
    loading,
    error,
    refetch
  }
} 