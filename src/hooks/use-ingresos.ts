'use client'

import { useState, useEffect, useCallback } from 'react'
import type { IngresosReport } from '@/types/dashboard'
import { getCached, setCached } from '@/lib/frontend-cache'

interface UseIngresosOptions {
  process: 'ccm' | 'prr'
  days?: number
  enabled?: boolean
  backgroundFetch?: boolean
  backgroundFetchInterval?: number
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
  enabled = true,
  backgroundFetch = false,
  backgroundFetchInterval = 5 * 60 * 1000, // 5 minutos por defecto
}: UseIngresosOptions): UseIngresosReturn {
  const [report, setReport] = useState<IngresosReport | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentDays, setCurrentDays] = useState(days)

  const fetchData = useCallback(async ({ isBackground = false } = {}) => {
    if (!enabled && !isBackground) return

    if (!isBackground) {
      setIsLoading(true)
    }
    setError(null)

    try {
      const cacheKey = `ingresos_${process}_${currentDays}`
      const cached = getCached<IngresosReport>(cacheKey)
      if (cached) {
        setReport(cached)
        if (!isBackground) setIsLoading(false)
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

      setReport(result.report)
      setCached(cacheKey, result.report)

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido'
      if (!isBackground) {
        setError(errorMessage)
      }
      console.error(`❌ Error fetching ingresos data (${isBackground ? 'background' : 'foreground'}):`, errorMessage)
      setReport(null)
    } finally {
      if (!isBackground) {
        setIsLoading(false)
      }
    }
  }, [enabled, process, currentDays])

  const updatePeriod = useCallback((newDays: number) => {
    setCurrentDays(newDays)
  }, [])

  const refreshData = useCallback(async () => {
    await fetchData({ isBackground: false })
  }, [fetchData])

  // Efecto para carga en PRIMER PLANO (cuando el módulo está activo)
  useEffect(() => {
    if (enabled) {
      fetchData({ isBackground: false })
    }
  }, [enabled, fetchData])

  // Efecto para carga en SEGUNDO PLANO (cuando el módulo está inactivo)
  useEffect(() => {
    if (enabled || !backgroundFetch) {
      return // Salir si el módulo está activo o la función está deshabilitada
    }

    let intervalId: NodeJS.Timeout

    // Demora inicial aleatoria para evitar que todos los hooks se disparen a la vez
    const initialDelay = Math.random() * 5000 // 0-5 segundos

    const timeoutId = setTimeout(() => {
      console.log(`[Background] Pre-cargando datos para: Ingresos ${process.toUpperCase()}`)
      fetchData({ isBackground: true })

      // Después de la carga inicial, establecer el intervalo periódico
      intervalId = setInterval(() => {
        console.log(`[Background] Refrescando datos para: Ingresos ${process.toUpperCase()}`)
        fetchData({ isBackground: true })
      }, backgroundFetchInterval)
    }, initialDelay)

    // Función de limpieza para desmontar
    return () => {
      clearTimeout(timeoutId)
      if (intervalId) {
        clearInterval(intervalId)
      }
    }
  }, [enabled, backgroundFetch, process, backgroundFetchInterval, fetchData])

  return {
    report,
    isLoading,
    error,
    refreshData,
    updatePeriod
  }
} 