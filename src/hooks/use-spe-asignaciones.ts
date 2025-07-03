import { useQuery } from '@tanstack/react-query'
import { logError } from '@/lib/logger'

interface AsignacionItem {
  evaluador: string;
  asignacionesPorProceso: { [proceso: string]: number };
  totalAsignaciones: number;
}

interface AsignacionesResponse {
  data: AsignacionItem[];
  metadata: {
    procesos: string[];
    periodoAnalisis: string;
  };
}

interface ApiResponse {
  success: boolean;
  data?: AsignacionItem[];
  metadata?: AsignacionesResponse['metadata'];
  error?: string;
}

const fetchSpeAsignaciones = async (days: number): Promise<AsignacionesResponse> => {
  try {
    const response = await fetch(`/api/spe/asignaciones?days=${days}`)
    if (!response.ok) {
      const errorData: ApiResponse = await response.json()
      throw new Error(errorData.error || `Error del servidor: ${response.status}`)
    }
    const data: ApiResponse = await response.json()
    if (!data.success) {
      throw new Error(data.error || 'La API devolvió una respuesta no exitosa.')
    }
    return { 
      data: data.data || [], 
      metadata: data.metadata || {
        procesos: [],
        periodoAnalisis: `${days} días`
      }
    }
  } catch (error) {
    logError('Error al obtener datos de asignaciones SPE:', error)
    throw error
  }
}

export const useSpeAsignaciones = (days: number) => {
  return useQuery<AsignacionesResponse, Error>({
    queryKey: ['speAsignaciones', days],
    queryFn: () => fetchSpeAsignaciones(days),
    staleTime: 10 * 60 * 1000, // 10 minutos
    gcTime: 30 * 60 * 1000, // 30 minutos en cache
    refetchOnWindowFocus: true,
  })
} 