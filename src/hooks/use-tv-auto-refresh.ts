'use client'

import { useEffect, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'

interface UseTvAutoRefreshOptions {
  intervalMinutes?: number // Intervalo en minutos para auto-refresh
  enabled?: boolean // Si está habilitado el auto-refresh
  process?: string // Proceso actual para refrescar datos específicos
}

export function useTvAutoRefresh({ 
  intervalMinutes = 5, 
  enabled = true,
  process = 'ccm'
}: UseTvAutoRefreshOptions = {}) {
  const queryClient = useQueryClient()

  const refreshData = useCallback(async () => {
    if (!enabled) return

    try {
      console.log(`🔄 [TV Auto-Refresh] Refrescando datos para proceso: ${process}`)
      
      // Invalidar queries específicas del proceso actual
      await queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey[0] as string
          const processInKey = query.queryKey[1] as string
          
          // Refrescar queries relacionadas con el proceso actual
          if (process === 'spe') {
            return (
              key === 'speDataPendientes' ||
              key === 'speIngresosReport' ||
              key === 'speProduccion' ||
              key === 'spe-avance-pendientes'
            )
          } else if (process === 'sol') {
            return (
              key === 'sol-data' ||
              key === 'solIngresosReport' ||
              key === 'solProduccion' ||
              key === 'sol-avance-pendientes'
            )
          } else {
            return (
              (key === 'pendientesReport' && processInKey === process) ||
              (key === 'produccionReport' && processInKey === process) ||
              (key === 'ingresosReport' && processInKey === process) ||
              (key === 'avance-pendientes' && processInKey === process.toUpperCase()) ||
              key === 'evaluadores'
            )
          }
        }
      })

      console.log(`✅ [TV Auto-Refresh] Datos refrescados exitosamente`)
    } catch (error) {
      console.error('❌ [TV Auto-Refresh] Error refrescando datos:', error)
    }
  }, [queryClient, enabled, process])

  // Auto-refresh timer
  useEffect(() => {
    if (!enabled) return

    const intervalMs = intervalMinutes * 60 * 1000
    
    // Refresh inicial inmediato (opcional)
    refreshData()

    // Configurar intervalo
    const intervalId = setInterval(refreshData, intervalMs)

    console.log(`⏰ [TV Auto-Refresh] Configurado para refrescar cada ${intervalMinutes} minutos`)

    return () => {
      clearInterval(intervalId)
      console.log(`🛑 [TV Auto-Refresh] Auto-refresh detenido`)
    }
  }, [refreshData, intervalMinutes, enabled])

  // Refresh manual
  const manualRefresh = useCallback(async () => {
    await refreshData()
  }, [refreshData])

  return {
    manualRefresh,
    isEnabled: enabled,
    intervalMinutes
  }
} 