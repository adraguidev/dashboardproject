import { useQuery } from '@tanstack/react-query'
import { logError } from '@/lib/logger'

interface FechaErradaItem {
  evaluador: string;
  fechaTrabajoOriginal: string;
  numeroTramite: string;
  razonError: string;
  fechaDeteccion: string;
}

interface RankingFechasErradas {
  evaluador: string;
  totalErrores: number;
  erroresPorTipo: {
    fechaFutura: number;
    fechaInvalida: number;
    fechaMuyAntigua: number;
  };
  ejemplosErrores: FechaErradaItem[];
}

interface FechasErradasResponse {
  data: RankingFechasErradas[];
  metadata: {
    totalEvaluadoresConErrores: number;
    totalErroresDetectados: number;
    fechaAnalisis: string;
    periodoAnalisis: string;
  };
}

interface ApiResponse {
  success: boolean;
  data?: RankingFechasErradas[];
  metadata?: FechasErradasResponse['metadata'];
  error?: string;
}

const fetchFechasErradas = async (): Promise<FechasErradasResponse> => {
  try {
    const response = await fetch('/api/spe/fechas-erradas')
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
        totalEvaluadoresConErrores: 0,
        totalErroresDetectados: 0,
        fechaAnalisis: new Date().toISOString().split('T')[0],
        periodoAnalisis: '60 días'
      }
    }
  } catch (error) {
    logError('Error al obtener datos de fechas erróneas SPE:', error)
    throw error
  }
}

export const useFechasErradas = () => {
  return useQuery<FechasErradasResponse, Error>({
    queryKey: ['speFechasErradas'],
    queryFn: fetchFechasErradas,
    staleTime: 10 * 60 * 1000, // 10 minutos
    gcTime: 30 * 60 * 1000, // 30 minutos en cache
    refetchInterval: 10 * 60 * 1000, // Auto-refresh cada 10 minutos
    refetchOnWindowFocus: true,
    refetchIntervalInBackground: false,
    retry: 1,
  })
} 