import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

// Tipos para el dashboard unificado
export interface DashboardData {
  ingresos: any[];
  produccion: any[];
  pendientes: any[];
  evaluadores: any[];
  kpis: {
    totalCCM: number;
    totalPRR: number;
  };
  processes: Array<{
    id: string;
    name: string;
    description: string;
  }>;
  metadata: {
    proceso: string;
    timestamp: number;
    cacheHit: boolean;
    errors: string[];
  };
}

interface DashboardError {
  error: string;
  details: string;
  metadata: {
    timestamp: number;
    cacheHit: boolean;
    errors: string[];
  };
}

/**
 * Hook unificado para el dashboard usando TanStack Query
 * Implementa patrón enterprise con:
 * - Carga única de todos los datos
 * - Cache inteligente con invalidación
 * - Prefetching automático de otros procesos
 * - Error handling granular
 */
export function useDashboardUnified(proceso: string) {
  const queryClient = useQueryClient();

  // Query principal del dashboard
  const dashboardQuery = useQuery<DashboardData, DashboardError>({
    queryKey: ['dashboard', proceso],
    queryFn: async () => {
      const response = await fetch(`/api/dashboard/unified?proceso=${proceso}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || `HTTP ${response.status}`);
      }
      
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutos fresh
    gcTime: 30 * 60 * 1000, // 30 minutos en cache
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    retry: (failureCount, error) => {
      // No retry en errores 4xx del cliente
      const status = (error as any)?.status;
      if (status >= 400 && status < 500) return false;
      return failureCount < 3;
    },
    // Transformar datos para facilitar el uso
    select: (data) => ({
      ...data,
      // Flags de disponibilidad para módulos
      hasIngresos: data.ingresos?.length > 0,
      hasProduccion: data.produccion?.length > 0,
      hasPendientes: data.pendientes?.length > 0,
      hasEvaluadores: data.evaluadores?.length > 0,
      hasErrors: data.metadata.errors.length > 0,
    }),
  });

  // Prefetching inteligente de otros procesos en background
  useEffect(() => {
    if (dashboardQuery.isSuccess && !dashboardQuery.isFetching) {
      const otherProcesos = ['CCM', 'PRR'].filter(p => p !== proceso);
      
      otherProcesos.forEach(otherProceso => {
        // Solo prefetch si no está ya en cache o está stale
        const existingQuery = queryClient.getQueryData(['dashboard', otherProceso]);
        const queryState = queryClient.getQueryState(['dashboard', otherProceso]);
        
        const isStale = queryState ? 
          Date.now() - queryState.dataUpdatedAt > 5 * 60 * 1000 : true;
        
        if (!existingQuery || isStale) {
          queryClient.prefetchQuery({
            queryKey: ['dashboard', otherProceso],
            queryFn: async () => {
              const response = await fetch(`/api/dashboard/unified?proceso=${otherProceso}`);
              if (!response.ok) throw new Error(`HTTP ${response.status}`);
              return response.json();
            },
            staleTime: 5 * 60 * 1000,
          });
        }
      });
    }
  }, [proceso, dashboardQuery.isSuccess, dashboardQuery.isFetching, queryClient]);

  // Función para invalidar y refrescar
  const invalidateAndRefresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['dashboard', proceso] });
    await queryClient.refetchQueries({ queryKey: ['dashboard', proceso] });
  };

  // Función para invalidar todos los procesos
  const invalidateAll = async () => {
    await queryClient.invalidateQueries({ queryKey: ['dashboard'] });
  };

  // Función para obtener datos específicos por módulo
  const getModuleData = (module: keyof DashboardData) => {
    return dashboardQuery.data?.[module] || [];
  };

  // Estado agregado para facilitar el uso
  const isLoading = dashboardQuery.isPending;
  const isError = dashboardQuery.isError;
  const error = dashboardQuery.error;
  const data = dashboardQuery.data;

  // Estados derivados útiles
  const isDataAvailable = !isLoading && !isError && data;
  const hasPartialErrors = (data as any)?.hasErrors || false;
  const lastUpdated = data?.metadata.timestamp;

  return {
    // Estados principales
    isLoading,
    isError,
    error,
    data,
    
    // Estados derivados
    isDataAvailable,
    hasPartialErrors,
    lastUpdated,
    
    // Funciones de utilidad
    invalidateAndRefresh,
    invalidateAll,
    getModuleData,
    
    // Datos específicos por módulo (para compatibilidad)
    ingresos: data?.ingresos || [],
    produccion: data?.produccion || [],
    pendientes: data?.pendientes || [],
    evaluadores: data?.evaluadores || [],
    kpis: data?.kpis || { totalCCM: 0, totalPRR: 0 },
    processes: data?.processes || [],
    
    // Metadata
    metadata: data?.metadata || {
      proceso,
      timestamp: 0,
      cacheHit: false,
      errors: []
    },
    
    // Estados de TanStack Query para debugging
    isFetching: dashboardQuery.isFetching,
    isStale: dashboardQuery.isStale,
    isPaused: dashboardQuery.isPaused,
    
    // Funciones avanzadas
    queryClient, // Para operaciones manuales si es necesario
  };
}

/**
 * Hook para operaciones de cache del dashboard
 */
export function useDashboardCache() {
  const queryClient = useQueryClient();

  const clearAllCache = () => {
    queryClient.removeQueries({ queryKey: ['dashboard'] });
  };

  const getCachedProcesses = () => {
    const queries = queryClient.getQueriesData({ queryKey: ['dashboard'] });
    return queries.map(([key, data]) => ({
      proceso: key[1],
      data,
      lastUpdated: queryClient.getQueryState(key)?.dataUpdatedAt || 0
    }));
  };

  const prefetchProcess = async (proceso: string) => {
    return queryClient.prefetchQuery({
      queryKey: ['dashboard', proceso],
      queryFn: async () => {
        const response = await fetch(`/api/dashboard/unified?proceso=${proceso}`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
      },
      staleTime: 5 * 60 * 1000,
    });
  };

  return {
    clearAllCache,
    getCachedProcesses,
    prefetchProcess,
    queryClient,
  };
} 