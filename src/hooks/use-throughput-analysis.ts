'use client'

import { useQuery } from '@tanstack/react-query'

export interface ThroughputData {
  fecha: string;
  Ingresos: number;
  'Producción Evaluadores': number;
  'Aprobación Automática': number;
}

interface ThroughputApiResponse {
  success: boolean;
  data: ThroughputData[];
  details?: string;
}

export function useThroughputAnalysis(proceso: 'ccm' | 'prr', days: number) {
  const queryKey = ['throughputAnalysis', proceso, days];

  return useQuery<ThroughputData[], Error>({
    queryKey,
    queryFn: async () => {
      const response = await fetch(`/api/analysis/throughput?proceso=${proceso}&days=${days}`);
      if (!response.ok) {
        throw new Error('No se pudo obtener el análisis de throughput');
      }
      const result: ThroughputApiResponse = await response.json();
      if (!result.success) {
        throw new Error(result.details || 'Error en la respuesta de la API');
      }
      return result.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
    refetchOnWindowFocus: false,
  });
} 