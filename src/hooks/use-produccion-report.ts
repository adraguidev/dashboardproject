'use client'

import { useState, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ProduccionReportSummary, Evaluador } from '@/types/dashboard'

interface UseProduccionReportOptions {
  process: 'ccm' | 'prr'
  days?: number
  dayType?: 'TODOS' | 'LABORABLES' | 'FIN_DE_SEMANA'
  enabled?: boolean
}

interface ProduccionReportData {
  report: ProduccionReportSummary
  otherProcessEvaluadores: Evaluador[]
}

export function useProduccionReport({
  process,
  days: initialDays = 20,
  dayType: initialDayType = 'TODOS',
  enabled = true,
}: UseProduccionReportOptions) {
  const [days, setDays] = useState(initialDays);
  const [dayType, setDayType] = useState(initialDayType);

  const queryKey = ['produccionReport', process, days, dayType];

  const {
    data,
    isLoading: loading,
    error: queryError,
    refetch,
  } = useQuery<ProduccionReportData, Error>({
    queryKey,
    queryFn: async () => {
      // Fetch del reporte de producción
      const reportResponse = await fetch(`/api/dashboard/produccion-report?process=${process}&days=${days}&dayType=${dayType}`);
      if (!reportResponse.ok) {
        throw new Error(`Error en reporte de producción: ${reportResponse.statusText}`);
      }
      const reportResult: { success: boolean, report: ProduccionReportSummary, error?: string } = await reportResponse.json();
      if (!reportResult.success) {
        throw new Error(reportResult.error || 'Error desconocido en reporte de producción');
      }

      // Fetch de evaluadores del otro proceso
      const otherProcess = process === 'ccm' ? 'prr' : 'ccm';
      const evaluadoresResponse = await fetch(`/api/dashboard/evaluadores?process=${otherProcess}`);
      let otherProcessEvaluadores: Evaluador[] = [];
      if (evaluadoresResponse.ok) {
        const evaluadoresResult: { success: boolean, evaluadores: Evaluador[], error?: string } = await evaluadoresResponse.json();
        if (evaluadoresResult.success) {
          otherProcessEvaluadores = evaluadoresResult.evaluadores || [];
        }
      }

      return {
        report: reportResult.report,
        otherProcessEvaluadores,
      };
    },
    enabled,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const handleRefetch = useCallback(async (newDays?: number, newDayType?: 'TODOS' | 'LABORABLES' | 'FIN_DE_SEMANA') => {
    if (newDays !== undefined) setDays(newDays);
    if (newDayType !== undefined) setDayType(newDayType);
    
    // El cambio de estado de setDays/setDayType disparará automáticamente el refetch
    // gracias a que están en la queryKey. Sin embargo, para un refetch explícito,
    // llamamos directamente a la función de TanStack.
    console.log(`🔄 Refrescando datos de produccion-report para: ${process.toUpperCase()}`);
    await refetch();
  }, [refetch, process]);

  const error = queryError ? queryError.message : null;

  return {
    report: data?.report ?? null,
    otherProcessEvaluadores: data?.otherProcessEvaluadores ?? [],
    loading,
    error,
    refetch: handleRefetch,
  };
} 