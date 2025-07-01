'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister'
import { useState, lazy, Suspense } from 'react';

// Cargar DevTools dinámicamente solo en desarrollo
const ReactQueryDevtools = lazy(() =>
  process.env.NODE_ENV === 'development'
    ? import('@tanstack/react-query-devtools').then(m => ({ default: m.ReactQueryDevtools }))
    : Promise.resolve({ default: () => null })
);

interface QueryProviderProps {
  children: React.ReactNode;
}

export function QueryProvider({ children }: QueryProviderProps) {
  // Crear QueryClient con configuración enterprise
  const [queryClient] = useState(
    () => new QueryClient({
      defaultOptions: {
        queries: {
          // Cache durante 6 horas (igual que TTL máximo en Redis)
          staleTime: 6 * 60 * 60 * 1000, // 6 h
          // Mantener en memoria hasta 24 h para rehidratación rápida
          gcTime: 24 * 60 * 60 * 1000, // 24 h
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

  const persister = createSyncStoragePersister({
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    throttleTime: 1000, // evita escrituras excesivas
  })

  const shouldPersist = (q: any) => q.queryKey?.some?.((k: any) => k === 'ccm' || k === 'prr')

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister,
        maxAge: 30 * 24 * 60 * 60 * 1000,
        buster: 'v1',
        dehydrateOptions: { shouldDehydrateQuery: shouldPersist },
      }}
    >
      {children}
      {/* DevTools cargado dinámicamente solo en desarrollo */}
      <Suspense fallback={null}>
        <ReactQueryDevtools initialIsOpen={false} />
      </Suspense>
    </PersistQueryClientProvider>
  );
} 