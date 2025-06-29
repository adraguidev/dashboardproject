'use client'

import { useQueryClient, useIsFetching } from '@tanstack/react-query'
import React, { useState } from 'react'
import { useDashboardUnified } from '@/hooks/use-dashboard-unified'
import { DashboardHeader } from '@/components/dashboard/dashboard-header'
import { ProcessModules } from '@/components/dashboard/process-modules'
import { ErrorDisplay } from '@/components/ui/error-boundary'

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
      console.log('🔄 [START] Global Refresh Initiated.');

      // 1. Limpiar el caché del servidor.
      await fetch('/api/cache/clear', { method: 'POST' });
      console.log('✅ Server-side cache API call complete.');

      // 2. Pausa intencionada para evitar la condición de carrera del servidor.
      // Esto asegura que el servidor haya procesado la limpieza antes de que volvamos a pedir datos.
      await new Promise(resolve => setTimeout(resolve, 300));

      // 3. Invalidar y forzar la recarga de TODAS las queries (activas e inactivas).
      // Este es el método correcto para una actualización global completa.
      await queryClient.invalidateQueries({ refetchType: 'all' });
      console.log('✅ [COMPLETE] All client queries invalidated. Refetch triggered.');

    } catch (err) {
      console.error("❌ Error during global refresh:", err);
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
            error={(error as any)?.message || (error as any)?.details || 'Error desconocido'} 
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
 
 