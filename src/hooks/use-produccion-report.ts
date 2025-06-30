'use client'

import { useState, useCallback, useEffect } from 'react'
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

interface ProduccionReportApiResponse {
  success: boolean;
  report: ProduccionReportSummary;
  error?: string;
}

interface EvaluadoresApiResponse {
  evaluadores?: Evaluador[];
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
      console.log(`🚀 Fetching produccion-report: process=${process}, days=${days}, dayType=${dayType}`);
      const reportResponse = await fetch(`/api/dashboard/produccion-report?process=${process}&days=${days}&dayType=${dayType}`);
      if (!reportResponse.ok) {
        throw new Error(`Error en reporte de producción: ${reportResponse.statusText}`);
      }
      const reportResult: ProduccionReportApiResponse = await reportResponse.json();
      if (!reportResult.success) {
        throw new Error(reportResult.error || 'Error desconocido en reporte de producción');
      }

      const otherProcess = process === 'ccm' ? 'prr' : 'ccm';
      const evaluadoresResponse = await fetch(`/api/dashboard/evaluadores?process=${otherProcess}`);
      let otherProcessEvaluadores: Evaluador[] = [];
      if (evaluadoresResponse.ok) {
        try {
          const evaluadoresResult: EvaluadoresApiResponse | Evaluador[] = await evaluadoresResponse.json();
          otherProcessEvaluadores = Array.isArray(evaluadoresResult) ? evaluadoresResult : (evaluadoresResult.evaluadores || []);
        } catch (e) {
          console.error("Error parsing evaluadores response:", e);
          otherProcessEvaluadores = [];
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

  const updateFilters = (newFilters: { days?: number, dayType?: 'TODOS' | 'LABORABLES' | 'FIN_DE_SEMANA' }) => {
    console.log(`🔄 Actualizando filtros a:`, newFilters);
    if (newFilters.days !== undefined) {
      setDays(newFilters.days);
    }
    if (newFilters.dayType !== undefined) {
      setDayType(newFilters.dayType);
    }
  };

  const error = queryError ? queryError.message : null;

  return {
    report: data?.report ?? null,
    otherProcessEvaluadores: data?.otherProcessEvaluadores ?? [],
    loading,
    error,
    refetch: updateFilters,
    currentFilters: { days, dayType }
  };
} 