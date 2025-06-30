import { useQuery } from '@tanstack/react-query'

export interface ProcessSummary {
  proceso: string
  estado: string
  anio: string
  trimestre: string
  mes: string
  total: number
}

interface ApiResponse {
  success: boolean
  data?: ProcessSummary[]
  error?: string
}

export const useSpeSummary = () => {
  const fetcher = async (): Promise<ProcessSummary[]> => {
    const resp = await fetch('/api/spe/summary-by-process')
    if (!resp.ok) {
      const err: ApiResponse = await resp.json()
      throw new Error(err.error || `HTTP ${resp.status}`)
    }
    const data: ApiResponse = await resp.json()
    if (!data.success) throw new Error(data.error || 'Respuesta no exitosa')
    return data.data || []
  }

  return useQuery<ProcessSummary[], Error>({
    queryKey: ['speSummaryByProcess'],
    queryFn: fetcher,
    staleTime: 10 * 60 * 1000,
  })
} 