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
  backgroundFetch?: boolean
  backgroundFetchInterval?: number
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
  enabled = true,
  backgroundFetch = false,
  backgroundFetchInterval = 5.5 * 60 * 1000, // 5.5 minutos
}: UseProduccionReportOptions): UseProduccionReportResult {
  const [report, setReport] = useState<ProduccionReportSummary | null>(null)
  const [otherProcessEvaluadores, setOtherProcessEvaluadores] = useState<Evaluador[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentDays, setCurrentDays] = useState(days)
  const [currentDayType, setCurrentDayType] = useState(dayType)

  const fetchReport = useCallback(async ({ isBackground = false } = {}) => {
    if (!enabled && !isBackground) return

    if (!isBackground) {
      setLoading(true)
    }
    setError(null)

    try {
      const cacheKey = `produccion_${process}_${currentDays}_${currentDayType}`
      const cached = getCached<ProduccionReportSummary>(cacheKey)
      if (cached) {
        setReport(cached)
        if (!isBackground) setLoading(false)
        return
      }

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
      const evaluadoresResponse = await fetch(`/api/dashboard/evaluadores?process=${otherProcess}`)
      
      if (evaluadoresResponse.ok) {
        const evaluadoresResult: { 
          success: boolean; 
          evaluadores: Evaluador[]; 
          error?: string 
        } = await evaluadoresResponse.json()

        if (evaluadoresResult.success) {
          setOtherProcessEvaluadores(evaluadoresResult.evaluadores || [])
        } else {
          console.warn('⚠️ No se pudieron cargar evaluadores del proceso contrario:', evaluadoresResult.error)
          setOtherProcessEvaluadores([])
        }
      } else {
        console.warn('⚠️ Error al obtener evaluadores del proceso contrario')
        setOtherProcessEvaluadores([])
      }

    } catch (err) {
      if (!isBackground) {
        console.error('❌ Error fetching producción report:', err)
        setError(err instanceof Error ? err.message : 'Error desconocido')
        setReport(null)
        setOtherProcessEvaluadores([])
      }
    } finally {
      if (!isBackground) {
        setLoading(false)
      }
    }
  }, [enabled, process, currentDays, currentDayType])

  const refetch = useCallback(async (newDays?: number, newDayType?: 'TODOS' | 'LABORABLES' | 'FIN_DE_SEMANA') => {
    if (newDays !== undefined) setCurrentDays(newDays)
    if (newDayType !== undefined) setCurrentDayType(newDayType)
    // Se necesita un pequeño truco para que el refetch use los nuevos valores
    // ya que el state no se actualiza instantáneamente.
    const finalDays = newDays !== undefined ? newDays : currentDays
    const finalDayType = newDayType !== undefined ? newDayType : currentDayType

    await fetchReport({ isBackground: false }) // refetch siempre es en primer plano
  }, [fetchReport, currentDays, currentDayType])

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
    const initialDelay = Math.random() * 7000 // 0-7 segundos

    const timeoutId = setTimeout(() => {
      console.log(`[Background] Pre-cargando datos para: Producción ${process.toUpperCase()}`)
      fetchReport({ isBackground: true })

      intervalId = setInterval(() => {
        console.log(`[Background] Refrescando datos para: Producción ${process.toUpperCase()}`)
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
    otherProcessEvaluadores,
    loading,
    error,
    refetch
  }
} 