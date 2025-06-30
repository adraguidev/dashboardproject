'use client'

import { useQuery } from '@tanstack/react-query'

interface ResueltosAnalysisData {
  mes: string;
  estadopre: string;
  operadorpre: string | null;
  total: number;
}

export function useResueltosAnalysis(proceso: 'ccm' | 'prr') {
  return useQuery({
    queryKey: ['resueltos-analysis', proceso],
    queryFn: async (): Promise<ResueltosAnalysisData[]> => {
      const response = await fetch(`/api/analysis/resueltos?proceso=${proceso}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || 'Error al obtener análisis de resueltos');
      }
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Error en la respuesta del servidor');
      }
      
      return result.data || [];
    },
    staleTime: 10 * 60 * 1000, // 10 minutos
    gcTime: 30 * 60 * 1000, // 30 minutos
    retry: 2,
    refetchOnWindowFocus: false,
  });
} 