'use client'

import { useQueryClient, useIsFetching } from '@tanstack/react-query'
import React, { useState } from 'react'
import { useDashboardUnified } from '@/hooks/use-dashboard-unified'
import { DashboardHeader } from '@/components/dashboard/dashboard-header'
import { ProcessModules } from '@/components/dashboard/process-modules'
import { ErrorDisplay } from '@/components/ui/error-boundary'
import { clearAllCache as clearLocalStorageCache } from '@/lib/frontend-cache'

export default function DashboardPage() {
  const queryClient = useQueryClient()
  const [selectedProcess, setSelectedProcess] = useState<'ccm' | 'prr'>('ccm')
  const [activeModule, setActiveModule] = useState('pendientes')
  
  // Hook de TanStack para un indicador de carga global y fiable.
  const isFetching = useIsFetching();

  // Hook unificado solo para la carga inicial y errores.
  const proceso = selectedProcess.toUpperCase() as 'CCM' | 'PRR'
  const { 
    isLoading: isInitialLoading, 
    error, 
  } = useDashboardUnified(proceso)

  const handleProcessChange = (process: 'ccm' | 'prr') => {
    setSelectedProcess(process)
  }

  const handleModuleChange = (moduleId: string) => {
    setActiveModule(moduleId)
  }

  const handleFullRefresh = async () => {
    try {
      console.log('🔄 [HARD RESET] Iniciando... Limpiando todos los niveles de caché.');

      // 1. Limpiar caché del NAVEGADOR (localStorage)
      clearLocalStorageCache();
      console.log('✅ Nivel 1/3: Caché del navegador (localStorage) limpiado.');

      // 2. Limpiar caché del SERVIDOR (Redis)
      await fetch('/api/cache/clear', { method: 'POST' });
      console.log('✅ Nivel 2/3: Caché del servidor (Redis) limpiado.');

      // 3. Resetear el caché del CLIENTE (TanStack Query)
      // Este es el método correcto. Ignora staleTime y fuerza una recarga inmediata.
      await queryClient.resetQueries();
      console.log('✅ Nivel 3/3: Caché del cliente (TanStack) reseteado. Recarga en curso...');

    } catch (err) {
      console.error("❌ Error durante el Hard Reset:", err);
    }
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50/30">
        <DashboardHeader
          selectedProcess={selectedProcess}
          onProcessChange={handleProcessChange}
          onRefresh={handleFullRefresh}
          loading={isInitialLoading || isFetching > 0}
        />
        <div className="max-w-6xl mx-auto px-6 py-8">
          <ErrorDisplay 
            error={(error as any).message || (error as any).details || 'Error desconocido'} 
            onRetry={handleFullRefresh} 
          />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50/30">
      <DashboardHeader
        selectedProcess={selectedProcess}
        onProcessChange={handleProcessChange}
        onRefresh={handleFullRefresh}
        loading={isInitialLoading || isFetching > 0}
      />
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="bg-white border border-gray-200/60 rounded-xl shadow-sm overflow-hidden">
          <ProcessModules
            selectedProcess={selectedProcess}
            selectedModule={activeModule}
            onModuleChange={handleModuleChange}
          />
        </div>
      </div>
    </div>
  )
} 
 
 