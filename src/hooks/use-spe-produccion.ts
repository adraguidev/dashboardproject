import { useQuery } from '@tanstack/react-query'
import { logError } from '@/lib/logger'

interface ProduccionItem {
  evaluador: string;
  expedientesPorFecha: { [fecha: string]: number };
  expedientesPorMes: { [mes: string]: number };
  expedientesPorAnio: { [anio: string]: number };
  totalGeneral: number;
}

interface ProduccionResponse {
  data: ProduccionItem[];
  periodos: {
    fechas: string[];
    meses: string[];
    anios: string[];
  };
}

interface ApiResponse {
  success: boolean;
  data?: ProduccionItem[];
  periodos?: {
    fechas: string[];
    meses: string[];
    anios: string[];
  };
  error?: string;
}

const fetchSpeProduccion = async (): Promise<ProduccionResponse> => {
  try {
    const response = await fetch('/api/spe/produccion')
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
      periodos: data.periodos || { fechas: [], meses: [], anios: [] }
    }
  } catch (error) {
    logError('Error al obtener datos de producción SPE:', error)
    throw error
  }
}

export const useSpeProduccion = () => {
  return useQuery<ProduccionResponse, Error>({
    queryKey: ['speProduccion'],
    queryFn: fetchSpeProduccion,
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 15 * 60 * 1000, // 15 minutos en cache
    refetchInterval: 5 * 60 * 1000, // Auto-refresh cada 5 minutos
    refetchOnWindowFocus: true,
    refetchIntervalInBackground: false,
    retry: 1,
  })
} 