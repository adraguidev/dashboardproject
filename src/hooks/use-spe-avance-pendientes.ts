import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'

interface SpeAvancePendientesData {
  fechas: string[]
  operadores: Array<{
    operador: string
    [fecha: string]: string | number
  }>
  proceso: 'SPE'
  anio: null
}

interface SpeAvancePendientesResponse {
  success: boolean
  data: SpeAvancePendientesData
  error?: string
}

export function useSpeAvancePendientes() {
  const queryClient = useQueryClient()
  
  const query = useQuery<SpeAvancePendientesResponse>({
    queryKey: ['spe-avance-pendientes'],
    queryFn: async () => {
      const response = await fetch(`/api/historico/spe-avance-pendientes`)
      if (!response.ok) {
        throw new Error('Error al obtener datos de avance de pendientes SPE')
      }
      return response.json()
    },
    staleTime: 2 * 60 * 1000, // 2 minutos
    gcTime: 5 * 60 * 1000, // 5 minutos en cache
    retry: 1,
    refetchOnWindowFocus: false,
  })

  const refreshData = useCallback(async () => {
    console.log('🔄 Refrescando datos de avance pendientes SPE...')
    await queryClient.invalidateQueries({ queryKey: ['spe-avance-pendientes'] })
    const result = await query.refetch()
    console.log('✅ Datos de avance pendientes SPE refrescados')
    return result
  }, [query.refetch, queryClient])

  return {
    ...query,
    refreshData
  }
} 