import { useQuery } from '@tanstack/react-query'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

interface SinAsignarDataPoint {
  fecha: string
  total: number
}

interface SinAsignarHistoricoResponse {
  success: boolean
  data: SinAsignarDataPoint[]
  error?: string
}

interface FormattedDataPoint {
    fecha: string;
    'Sin Asignar': number;
}

const fetchHistoricoSinAsignar = async (proceso: 'CCM' | 'PRR', dias: number): Promise<FormattedDataPoint[]> => {
  const response = await fetch(`/api/historico/sin-asignar?proceso=${proceso}&dias=${dias}`)
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Error al obtener datos del histórico de sin asignar')
  }
  
  const data: SinAsignarHistoricoResponse = await response.json()

  if (!data.success) {
    throw new Error(data.error || 'La API devolvió un error no exitoso')
  }

  // Formatear la fecha para el gráfico
  return data.data.map(item => ({
    fecha: format(parseISO(item.fecha + 'T12:00:00'), 'dd/MM', { locale: es }),
    'Sin Asignar': item.total
  }));
}

export const useHistoricoSinAsignar = (proceso: 'CCM' | 'PRR', dias: number) => {
  return useQuery<FormattedDataPoint[], Error>({
    queryKey: ['historicoSinAsignar', proceso, dias],
    queryFn: () => fetchHistoricoSinAsignar(proceso, dias),
    enabled: !!proceso && dias > 0, // La query solo se ejecuta si hay un proceso y dias es positivo
    staleTime: 1000 * 60 * 5, // 5 minutos
    refetchOnWindowFocus: false,
  })
} 