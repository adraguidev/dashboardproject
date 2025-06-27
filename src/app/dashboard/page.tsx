'use client'

import React, { useState } from 'react'
import { useDashboardUnified, useDashboardCache } from '@/hooks/use-dashboard-unified'
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
      console.log('🔄 Iniciando limpieza completa de caché...');
      
      // 1. Limpiar caché del servidor
      await fetch('/api/cache/clear', { method: 'POST' });
      console.log('✅ Caché del servidor limpiado');
      
      // 2. Limpiar caché de TanStack Query
      clearAllCache();
      console.log('✅ Caché de TanStack Query limpiado');
      
      // 3. Limpiar caché del frontend (localStorage)
      if (typeof window !== 'undefined') {
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('ufsm_cache_')) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key));
        console.log(`✅ Frontend cache limpiado: ${keysToRemove.length} elementos`);
      }
      
      // 4. Invalidar y refrescar datos del hook unificado
      await invalidateAndRefresh();
      console.log('✅ Datos unificados invalidados y refrescados');
      
      // 5. Refrescar el módulo activo en pantalla (¡La clave para Pendientes!)
      if (moduleRefreshRef.current) {
        console.log('🔄 Refrescando módulo activo específico...');
        await moduleRefreshRef.current();
        console.log('✅ Módulo activo refrescado');
      }
      
      console.log('🎉 Actualización completa exitosa');
      
    } catch (err) {
      console.error("❌ Error al refrescar los datos:", err);
      // alert('No se pudo actualizar la información. Por favor, inténtelo de nuevo.');
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
 
 