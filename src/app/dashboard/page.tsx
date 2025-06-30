'use client'

import { useQueryClient, useIsFetching } from '@tanstack/react-query'
import React, { useState } from 'react'
import { useSystemStatus } from '@/hooks/use-system-status'
import { DashboardHeader } from '@/components/dashboard/dashboard-header'
import { ProcessModules } from '@/components/dashboard/process-modules'
import { ErrorDisplay } from '@/components/ui/error-boundary'
import { clearAllCache as clearLocalStorageCache } from '@/lib/frontend-cache'

export default function DashboardPage() {
  const queryClient = useQueryClient()
  const [selectedProcess, setSelectedProcess] = useState<'ccm' | 'prr'>('ccm')
  const [activeModule, setActiveModule] = useState('pendientes')
  
  const isFetching = useIsFetching();

  const { 
    isLoading: isInitialLoading, 
    error, 
  } = useSystemStatus()

  const handleProcessChange = (process: 'ccm' | 'prr') => {
    setSelectedProcess(process)
  }

  const handleModuleChange = (moduleId: string) => {
    setActiveModule(moduleId)
  }

  const handleFullRefresh = async () => {
    try {
      console.log('🔄 [HARD RESET] Iniciando... Limpiando todos los niveles de caché.');

      clearLocalStorageCache();
      console.log('✅ Nivel 1/3: Caché del navegador (localStorage) limpiado.');

      await fetch('/api/cache/clear', { method: 'POST' });
      console.log('✅ Nivel 2/3: Caché del servidor (Redis) limpiado.');

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
            error={(error as any).message || 'Error desconocido'} 
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
 
 