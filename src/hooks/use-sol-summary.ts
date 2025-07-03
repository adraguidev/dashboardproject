import { useQuery } from '@tanstack/react-query'

export interface EstadoSummary {
  estado: string
  anio: string
  trimestre: string
  mes: string
  total: number
}

interface ApiResponse {
  success: boolean
  data?: EstadoSummary[]
  error?: string
}

export const useSolSummary = () => {
  const fetcher = async (): Promise<EstadoSummary[]> => {
    const resp = await fetch('/api/sol/summary')
    if (!resp.ok) {
      const err: ApiResponse = await resp.json()
      throw new Error(err.error || `HTTP ${resp.status}`)
    }
    const data: ApiResponse = await resp.json()
    if (!data.success) throw new Error(data.error || 'Respuesta no exitosa')
    return data.data || []
  }

  return useQuery<EstadoSummary[], Error>({
    queryKey: ['solSummaryByEstado'],
    queryFn: fetcher,
    staleTime: 10 * 60 * 1000, // 10 minutos
    gcTime: 20 * 60 * 1000, // 20 minutos
    refetchOnWindowFocus: true,
    retry: 2,
  })
} 