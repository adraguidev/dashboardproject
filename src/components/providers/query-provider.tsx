'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState } from 'react';

interface QueryProviderProps {
  children: React.ReactNode;
}

export function QueryProvider({ children }: QueryProviderProps) {
  // Crear QueryClient con configuración enterprise
  const [queryClient] = useState(
    () => new QueryClient({
      defaultOptions: {
        queries: {
          // Cache durante 5 minutos antes de considerarse stale
          staleTime: 5 * 60 * 1000, // 5 min
          // Mantener en cache 30 minutos después de unused
          gcTime: 30 * 60 * 1000, // 30 min
          // Retry automático con backoff exponencial
          retry: (failureCount, error) => {
            // No retry en errores 4xx (cliente) pero sí en 5xx (servidor)
            if ((error as any)?.status >= 400 && (error as any)?.status < 500) return false;
            return failureCount < 3;
          },
          retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
          // Refetch automático cuando se enfoca la ventana
          refetchOnWindowFocus: false,
          // Refetch cuando se reconecta
          refetchOnReconnect: true,
        }
      }
    })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* DevTools solo en desarrollo */}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  );
} 