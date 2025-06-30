import { useQuery } from '@tanstack/react-query'
import { logError } from '@/lib/logger'

export interface EstadoBreakdown {
  [estado: string]: number
}

export interface ProcesoDetalle {
  proceso: string
  total: number
  estados: EstadoBreakdown
}

interface ApiResponse {
  success: boolean
  data?: ProcesoDetalle[]
  error?: string
}

export const useSpeDetail = (evaluador: string, enabled = false) => {
  const fetcher = async (): Promise<ProcesoDetalle[]> => {
    const resp = await fetch(`/api/spe/detail?evaluador=${encodeURIComponent(evaluador)}`)
    if (!resp.ok) {
      const err: ApiResponse = await resp.json()
      throw new Error(err.error || `HTTP ${resp.status}`)
    }
    const data: ApiResponse = await resp.json()
    if (!data.success) throw new Error(data.error || 'Respuesta no exitosa')
    return data.data || []
  }

  return useQuery<ProcesoDetalle[], Error>({
    queryKey: ['speDetail', evaluador],
    queryFn: fetcher,
    enabled,
    staleTime: 10 * 60 * 1000,
  })
} 