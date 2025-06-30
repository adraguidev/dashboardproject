'use client'

import { useQuery } from '@tanstack/react-query'

interface SystemStatus {
  status: 'healthy' | 'error'
  message: string
  details?: any
}

export function useSystemStatus() {
  return useQuery<SystemStatus, Error>({
    queryKey: ['system-status'],
    queryFn: async () => {
      const response = await fetch('/api/dashboard/db-status');
      if (!response.ok) {
        throw new Error('El servidor no responde o hay un error de red.');
      }
      const data: SystemStatus = await response.json();
      if (data.status !== 'healthy') {
        throw new Error(data.message || 'La base de datos reportó un problema.');
      }
      return data;
    },
    retry: 1, // Intentar solo una vez
    staleTime: 60 * 1000, // Considerar el estado como fresco por 1 minuto
    refetchOnWindowFocus: false, // No recargar al cambiar de ventana
  });
} 