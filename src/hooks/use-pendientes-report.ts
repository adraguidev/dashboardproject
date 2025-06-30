'use client'

import { useState, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { PendientesReportSummary } from '@/types/dashboard'

// Tipo local para la agrupación
type GroupingType = 'year' | 'quarter' | 'month'

interface UsePendientesReportOptions {
  process: 'ccm' | 'prr'
  groupBy?: GroupingType
  enabled?: boolean
}

export function usePendientesReport({
  process,
  groupBy: initialGroupBy = 'year',
  enabled = true,
}: UsePendientesReportOptions) {
  const [groupBy, setGroupBy] = useState<GroupingType>(initialGroupBy)
  
  // La clave de la query ahora incluye el 'groupBy' para que se actualice
  const queryKey = ['pendientesReport', process, groupBy];

  const { data: report, isLoading: loading, error: queryError } = useQuery<PendientesReportSummary, Error>({
    queryKey,
    queryFn: async () => {
      console.log(`🚀 Fetching pendientes-report: process=${process}, groupBy=${groupBy}`);
      const response = await fetch(`/api/dashboard/pendientes-report?process=${process}&groupBy=${groupBy}`);
      if (!response.ok) {
        throw new Error(`Error en el reporte de pendientes: ${response.statusText}`);
      }
      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Error desconocido en el reporte de pendientes');
      }
      return result.report;
    },
    enabled,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // Esta función ahora solo actualiza el estado, y react-query se encarga del resto.
  const changeGrouping = useCallback((newGroupBy: GroupingType) => {
    console.log(`🔄 Cambiando agrupación de pendientes a: ${newGroupBy}`);
    setGroupBy(newGroupBy);
  }, []);

  const error = queryError ? queryError.message : null;

  return {
    report: report ?? null,
    loading,
    error,
    groupBy,
    changeGrouping,
  };
} 
 
 