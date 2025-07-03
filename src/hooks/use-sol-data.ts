import { useQuery } from '@tanstack/react-query'
import { logError } from '@/lib/logger'

// Esta interfaz debe coincidir con la definida en la ruta de la API
export interface SolData {
  fecha: string;
  responsable: string;
  casosResueltos: number;
  tipoServicio: string;
}

// Esta interfaz debe coincidir con la definida en la ruta de la API
export interface SolPendienteData {
  evaluador: string;
  expedientesPorAnio: { [anio: string]: number };
  expedientesPorTrimestre: { [trimestre: string]: number };
  expedientesPorMes: { [mes: string]: number };
  totalGeneral: number;
}

// Interfaz para la respuesta de la API
interface ApiResponse {
  success: boolean;
  data?: SolPendienteData[];
  periodos?: {
    anios: string[];
    trimestres: string[];
    meses: string[];
  };
  error?: string;
}

// Interfaz para los datos que devuelve el hook, que coincide con la respuesta de la API.
export interface SolPendientesResponse {
  data: SolPendienteData[];
  periodos: {
    anios: string[];
    trimestres: string[];
    meses: string[];
  };
}

const fetchSolData = async (): Promise<SolPendientesResponse> => {
  try {
    const response = await fetch('/api/sol/data')
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
    logError('Error al obtener datos de SOL desde el hook:', error)
    // Re-lanza el error para que react-query lo maneje
    throw error
  }
}

export const useSolData = () => {
  return useQuery({
    queryKey: ['sol-data'],
    queryFn: fetchSolData,
    staleTime: 5 * 60 * 1000, // 5 minutos - sincronizado con el backend
    gcTime: 10 * 60 * 1000, // 10 minutos
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    retry: 2,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
  })
} 