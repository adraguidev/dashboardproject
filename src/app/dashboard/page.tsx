'use client'

import { useState } from 'react'
import { useDashboardUnified, useDashboardCache } from '@/hooks/use-dashboard-unified'
import { DashboardHeader } from '@/components/dashboard/dashboard-header'
import { ProcessModules } from '@/components/dashboard/process-modules'
import { ErrorDisplay } from '@/components/ui/error-boundary'
import { AiChatFloating } from '@/components/ui/ai-chat-floating'

export default function DashboardPage() {
  const [selectedProcess, setSelectedProcess] = useState<'ccm' | 'prr'>('ccm')
  const [activeModule, setActiveModule] = useState('pendientes')

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
    console.log('🔄 Iniciando refresh completo del dashboard con TanStack Query')
    
    try {
      // 1. Limpiar cache de TanStack Query
      clearAllCache()
      
      // 2. Limpiar cache del servidor
      const response = await fetch('/api/cache/clear', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({})
      })
      
      if (response.ok) {
        const result = await response.json()
        console.log('✅ Cache del servidor limpiado:', result.message)
      } else {
        console.warn('⚠️ No se pudo limpiar cache del servidor')
      }
      
      // 3. Invalidar y refrescar datos del proceso actual
      await invalidateAll()
      
      console.log('✅ Dashboard refrescado completamente')
      
    } catch (error) {
      console.error('❌ Error durante refresh:', error)
      // Como fallback, intentar solo invalidar cache
      await invalidateAll()
    }
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50/30">
        <DashboardHeader
          selectedProcess={selectedProcess}
          onProcessChange={handleProcessChange}
          loading={isLoading}
        />
        <div className="max-w-6xl mx-auto px-6 py-8">
          <ErrorDisplay 
            error={(error as any)?.message || (error as any)?.details || 'Error desconocido'} 
            onRetry={handleFullRefresh} 
          />
        </div>
        
        {/* AI Chat Floating Button */}
        <AiChatFloating key={selectedProcess} currentProcess={selectedProcess} />
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
        loading={isLoading}
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

      {/* AI Chat Floating Button */}
      <AiChatFloating key={selectedProcess} currentProcess={selectedProcess} />
    </div>
  )
} 
 
 