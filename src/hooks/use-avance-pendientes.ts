import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'

interface AvancePendientesData {
  fechas: string[]
  operadores: Array<{
    operador: string
    [fecha: string]: string | number
  }>
  proceso: 'CCM' | 'PRR'
  anio: number | null
}

interface AvancePendientesResponse {
  success: boolean
  data: AvancePendientesData
  error?: string
}

export function useAvancePendientes(proceso: 'CCM' | 'PRR' = 'CCM') {
  const queryClient = useQueryClient()
  
  const query = useQuery<AvancePendientesResponse>({
    queryKey: ['avance-pendientes', proceso],
    queryFn: async () => {
      const params = new URLSearchParams({ proceso })
      
      const response = await fetch(`/api/historico/avance-pendientes?${params}`)
      if (!response.ok) {
        throw new Error('Error al obtener datos de avance de pendientes')
      }
      return response.json()
    },
    staleTime: 2 * 60 * 1000, // 2 minutos (reducido para permitir actualizaciones más frecuentes)
    gcTime: 5 * 60 * 1000, // 5 minutos en cache
    retry: 1,
    refetchOnWindowFocus: false,
  })

  const refreshData = useCallback(async () => {
    console.log('🔄 Refrescando datos de avance pendientes...')
    // Invalidar el cache primero para forzar una nueva consulta
    await queryClient.invalidateQueries({ queryKey: ['avance-pendientes', proceso] })
    const result = await query.refetch()
    console.log('✅ Datos de avance pendientes refrescados')
    return result
  }, [query.refetch, queryClient, proceso])

  return {
    ...query,
    refreshData
  }
} 