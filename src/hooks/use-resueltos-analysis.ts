'use client'

import { useQuery } from '@tanstack/react-query'

export interface ResueltosAnalysisData {
  summary: {
    currentYear: {
      year: number;
      total: number;
      avgMonthly: number;
      categories: { name: string; total: number }[];
    };
    previousYear: {
      year: number;
      total: number;
      avgMonthly: number;
      categories: { name: string; total: number }[];
    };
  };
  monthlyTrends: {
    comparison: { month: string; currentYear: number; previousYear: number }[];
  };
  categoryTrends: {
    categories: string[];
    byMonth: ({ month: string; } & { [key: string]: number | string })[];
  };
  operatorsDetails: {
    categories: string[];
    operators: ({ operator: string; total: number; } & { [key: string]: number | string })[];
  };
}

export function useResueltosAnalysis(proceso: 'ccm' | 'prr') {
  return useQuery({
    queryKey: ['resueltos-analysis', proceso],
    queryFn: async (): Promise<ResueltosAnalysisData | null> => {
      const response = await fetch(`/api/analysis/resueltos?proceso=${proceso}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || 'Error al obtener análisis de resueltos');
      }
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Error en la respuesta del servidor');
      }
      
      return result.data || null;
    },
    staleTime: 10 * 60 * 1000, // 10 minutos
    gcTime: 30 * 60 * 1000, // 30 minutos
    retry: 2,
    refetchOnWindowFocus: false,
  });
} 