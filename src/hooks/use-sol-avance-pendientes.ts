import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'

interface SolAvancePendientesData {
  fechas: string[]
  operadores: Array<{
    operador: string
    [fecha: string]: string | number
  }>
  proceso: 'SOL'
  anio: null
}

interface SolAvancePendientesResponse {
  success: boolean
  data: SolAvancePendientesData
  error?: string
}

export function useSolAvancePendientes() {
  const queryClient = useQueryClient()
  
  const query = useQuery<SolAvancePendientesResponse>({
    queryKey: ['sol-avance-pendientes'],
    queryFn: async () => {
      const response = await fetch(`/api/historico/sol-avance-pendientes`)
      if (!response.ok) {
        throw new Error('Error al obtener datos de avance de pendientes SOL')
      }
      return response.json()
    },
    staleTime: 2 * 60 * 1000, // 2 minutos
    gcTime: 5 * 60 * 1000, // 5 minutos en cache
    retry: 1,
    refetchOnWindowFocus: false,
  })

  const refreshData = useCallback(async () => {
    console.log('🔄 Refrescando datos de avance pendientes SOL...')
    await queryClient.invalidateQueries({ queryKey: ['sol-avance-pendientes'] })
    const result = await query.refetch()
    console.log('✅ Datos de avance pendientes SOL refrescados')
    return result
  }, [query.refetch, queryClient])

  return {
    ...query,
    refreshData
  }
} 