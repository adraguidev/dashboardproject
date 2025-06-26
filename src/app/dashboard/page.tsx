'use client'

import { useState } from 'react'
import { useDashboardUnified, useDashboardCache } from '@/hooks/use-dashboard-unified'
import { DashboardHeader } from '@/components/dashboard/dashboard-header'
import { ProcessModules } from '@/components/dashboard/process-modules'
import { ErrorDisplay } from '@/components/ui/error-boundary'

export default function DashboardPage() {
  const [selectedProcess, setSelectedProcess] = useState<'ccm' | 'prr'>('ccm')
  const [activeModule, setActiveModule] = useState('pendientes')
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Hook unificado enterprise - carga todos los datos de una vez
  const proceso = selectedProcess.toUpperCase() as 'CCM' | 'PRR'
  const { 
    isLoading, 
    error, 
    invalidateAndRefresh, 
    invalidateAll,
    hasPartialErrors,
    lastUpdated,
    isDataAvailable 
  } = useDashboardUnified(proceso)

  // Hook para operaciones de cache
  const { clearAllCache } = useDashboardCache()

  const handleProcessChange = (process: 'ccm' | 'prr') => {
    setSelectedProcess(process)
  }

  const handleModuleChange = (moduleId: string) => {
    setActiveModule(moduleId)
  }

  const handleFullRefresh = async () => {
    setIsRefreshing(true);
    try {
      const response = await fetch('/api/cache/clear', { method: 'POST' });
      if (!response.ok) {
        throw new Error('Error al limpiar la caché del servidor');
      }
      // Forzar la recarga de la página para obtener datos frescos
      window.location.reload();
    } catch (err) {
      console.error("Error al refrescar los datos:", err);
      // Aquí se podría usar un toast para notificar al usuario.
      alert('No se pudo actualizar la información. Por favor, inténtelo de nuevo.');
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
        
        {/* AI Chat Floating Button */}

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
      <div className="max-w-6xl mx-auto px-6 py-6">
        {/* Main Content */}
        <div className="bg-white border border-gray-200/60 rounded-xl shadow-sm overflow-hidden">
          <ProcessModules
            selectedProcess={selectedProcess}
            selectedModule={activeModule}
            onModuleChange={handleModuleChange}
          />
        </div>
      </div>

      {/* AI Chat Floating Button removido */}
    </div>
  )
} 
 
 