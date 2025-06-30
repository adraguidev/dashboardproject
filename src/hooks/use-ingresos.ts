'use client'

import { useState, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { IngresosReport } from '@/types/dashboard'

interface UseIngresosOptions {
  process: 'ccm' | 'prr'
  days?: number
  enabled?: boolean
}

export function useIngresos({
  process,
  days: initialDays = 30,
  enabled = true,
}: UseIngresosOptions) {
  const [days, setDays] = useState(initialDays);

  const queryKey = ['ingresosReport', process, days];

  const {
    data: report,
    isLoading,
    error: queryError,
    refetch,
  } = useQuery<IngresosReport, Error>({
    queryKey,
    queryFn: async () => {
      const response = await fetch(`/api/dashboard/ingresos?process=${process}&days=${days}`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const result: { success: boolean; report: IngresosReport; error?: string } = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Error desconocido al obtener el reporte de ingresos');
      }
      return result.report;
    },
    enabled,
    staleTime: 6 * 60 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const updatePeriod = useCallback((newDays: number) => {
    setDays(newDays);
  }, []);

  const refreshData = useCallback(async () => {
    console.log(`🔄 Refrescando datos de ingresos-report para: ${process.toUpperCase()}`);
    await refetch();
  }, [refetch, process]);

  const error = queryError ? queryError.message : null;

  return {
    report: report ?? null,
    isLoading,
    error,
    refreshData,
    updatePeriod,
  };
} 