'use client'

import { useState, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { PendientesReportSummary } from '@/types/dashboard'

interface UsePendientesReportOptions {
  process: 'ccm' | 'prr'
  groupBy?: 'year' | 'quarter' | 'month'
  enabled?: boolean
}

export function usePendientesReport({
  process,
  groupBy: initialGroupBy = 'year',
  enabled = true,
}: UsePendientesReportOptions) {
  const [groupBy, setGroupBy] = useState(initialGroupBy);

  const queryKey = ['pendientesReport', process, groupBy];

  const {
    data: report,
    isLoading: loading,
    error: queryError,
    refetch,
  } = useQuery<PendientesReportSummary, Error>({
    queryKey,
    queryFn: async () => {
      const response = await fetch(`/api/dashboard/pendientes-report?process=${process}&groupBy=${groupBy}`);
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      const result: { success: boolean; report: PendientesReportSummary; error?: string } = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Error desconocido al obtener el reporte de pendientes');
      }
      return result.report;
    },
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 10 * 60 * 1000, // 10 minutos
    refetchOnWindowFocus: false,
  });

  const changeGrouping = useCallback((newGroupBy: 'year' | 'quarter' | 'month') => {
    setGroupBy(newGroupBy);
  }, []);

  const refreshData = useCallback(async () => {
    console.log(`🔄 Refrescando datos de pendientes-report para: ${process.toUpperCase()}`);
    await refetch();
  }, [refetch, process]);

  const error = queryError ? queryError.message : null;

  return {
    report: report ?? null,
    loading,
    error,
    changeGrouping,
    groupBy,
    refreshData,
  };
} 
 
 