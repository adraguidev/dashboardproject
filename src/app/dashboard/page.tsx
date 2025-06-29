'use client'

import React, { useState } from 'react'
import { useDashboardUnified } from '@/hooks/use-dashboard-unified'
import { DashboardHeader } from '@/components/dashboard/dashboard-header'
import { ProcessModules } from '@/components/dashboard/process-modules'
import { ErrorDisplay } from '@/components/ui/error-boundary'

export default function DashboardPage() {
  const [selectedProcess, setSelectedProcess] = useState<'ccm' | 'prr'>('ccm')
  const [activeModule, setActiveModule] = useState('pendientes')
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Referencia para función de refresh del módulo activo
  const moduleRefreshRef = React.useRef<(() => Promise<void>) | null>(null);

  // Hook unificado enterprise - carga todos los datos de una vez
  const proceso = selectedProcess.toUpperCase() as 'CCM' | 'PRR'
  const { 
    isLoading, 
    error, 
    invalidateAndRefresh, 
    hasPartialErrors,
    lastUpdated,
    isDataAvailable 
  } = useDashboardUnified(proceso)

  const handleProcessChange = (process: 'ccm' | 'prr') => {
    setSelectedProcess(process)
  }

  const handleModuleChange = (moduleId: string) => {
    setActiveModule(moduleId)
  }

  const handleFullRefresh = async () => {
    setIsRefreshing(true);
    try {
      console.log('🔄 Iniciando actualización...');
      
      // 1. Limpiar caché del servidor (importante para obtener datos frescos de la DB)
      await fetch('/api/cache/clear', { method: 'POST' });
      console.log('✅ Caché del servidor limpiado');
      
      // 2. Invalidar y refrescar los datos del cliente usando la función del hook
      // Esto le dice a TanStack Query que los datos actuales son "stale" y debe recargarlos.
      await invalidateAndRefresh();
      console.log('✅ Datos del cliente invalidados y en proceso de refresco');
      
      // 3. Refrescar el módulo activo en pantalla (ej. la tabla de pendientes)
      if (moduleRefreshRef.current) {
        console.log('🔄 Refrescando módulo activo específico...');
        await moduleRefreshRef.current();
        console.log('✅ Módulo activo refrescado');
      }
      
      console.log('🎉 Actualización completa iniciada');
      
    } catch (err) {
      console.error("❌ Error al refrescar los datos:", err);
    } finally {
      setIsRefreshing(false);
    }
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50/30">
        <DashboardHeader
          selectedProcess={selectedProcess}
          onProcessChange={handleProcessChange}
          onRefresh={handleFullRefresh}
          loading={isLoading || isRefreshing}
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
      {/* Modern Header */}
      <DashboardHeader
        selectedProcess={selectedProcess}
        onProcessChange={handleProcessChange}
        onRefresh={handleFullRefresh}
        loading={isLoading || isRefreshing}
      />

      {/* Main Content Container - Balanced width */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Main Content */}
        <div className="bg-white border border-gray-200/60 rounded-xl shadow-sm overflow-hidden">
          <ProcessModules
            selectedProcess={selectedProcess}
            selectedModule={activeModule}
            onModuleChange={handleModuleChange}
            onRefresh={async () => {
              // Esta función se usa para configurar la referencia de refresh
              // La implementación real se hará en ProcessModules via moduleRefreshRef
            }}
            moduleRefreshRef={moduleRefreshRef}
          />
        </div>
      </div>
    </div>
  )
} 
 
 