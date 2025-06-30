import { useQuery } from '@tanstack/react-query'
import { logError } from '@/lib/logger'

// Esta interfaz debe coincidir con la definida en la ruta de la API
export interface SpeData {
  fecha: string;
  responsable: string;
  casosResueltos: number;
  tipoServicio: string;
}

// Esta interfaz debe coincidir con la definida en la ruta de la API
export interface SpePendienteData {
  evaluador: string;
  expedientesPorAnio: { [anio: string]: number };
  expedientesPorTrimestre: { [trimestre: string]: number };
  expedientesPorMes: { [mes: string]: number };
  totalGeneral: number;
}

interface ApiResponse {
  success: boolean
  data?: SpePendienteData[]
  periodos?: {
    anios: string[];
    trimestres: string[];
    meses: string[];
  }
  error?: string
}

// Interfaz para los datos que devuelve el hook, que coincide con la respuesta de la API.
export interface SpePendientesResponse {
  data: SpePendienteData[];
  periodos: {
    anios: string[];
    trimestres: string[];
    meses: string[];
  };
}

const fetchSpeData = async (): Promise<SpePendientesResponse> => {
  try {
    const response = await fetch('/api/spe/data')
    if (!response.ok) {
      const errorData: ApiResponse = await response.json()
      throw new Error(errorData.error || `Error del servidor: ${response.status}`)
    }
    const data: ApiResponse = await response.json()
    if (!data.success) {
      throw new Error(data.error || 'La API devolvió una respuesta no exitosa.')
    }
    // Devolvemos un objeto con los datos y los periodos
    return { 
      data: data.data || [], 
      periodos: data.periodos || { anios: [], trimestres: [], meses: [] }
    }
  } catch (error) {
    logError('Error al obtener datos de SPE desde el hook:', error)
    // Re-lanza el error para que react-query lo maneje
    throw error
  }
}

export const useSpeData = () => {
  return useQuery<SpePendientesResponse, Error>({
    queryKey: ['speDataPendientes'],
    queryFn: fetchSpeData,
    staleTime: 10 * 60 * 1000, // 10 minutos
    refetchOnWindowFocus: false,
    retry: 1, // Intentar una vez más en caso de error
  })
} 