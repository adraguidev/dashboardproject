'use client'

import { useState } from 'react'
import { useDashboard } from '@/hooks/use-dashboard'
import { clearAllCache } from '@/lib/frontend-cache'
import { DashboardHeader } from '@/components/dashboard/dashboard-header'
import { ProcessModules } from '@/components/dashboard/process-modules'
import { ErrorDisplay } from '@/components/ui/error-boundary'
import { AiChatFloating } from '@/components/ui/ai-chat-floating'

export default function DashboardPage() {
  const [selectedProcess, setSelectedProcess] = useState<'ccm' | 'prr'>('ccm')
  const [activeModule, setActiveModule] = useState('pendientes')

  const { isLoading, error } = useDashboard()

  const handleProcessChange = (process: 'ccm' | 'prr') => {
    setSelectedProcess(process)
  }

  const handleModuleChange = (moduleId: string) => {
    setActiveModule(moduleId)
  }

  const handleFullRefresh = async () => {
    console.log('🔄 Iniciando refresh completo del dashboard')
    
    try {
      // 1. Limpiar cache frontend
      clearAllCache()
      
      // 2. Limpiar cache del servidor - limpieza completa
      const response = await fetch('/api/cache/clear', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}) // Sin parámetros = limpieza completa
      })
      
      if (response.ok) {
        const result = await response.json()
        console.log('✅ Cache del servidor limpiado:', result.message)
      } else {
        console.warn('⚠️ No se pudo limpiar cache del servidor')
      }
      
      // 3. Recargar página para reinicializar todo
      window.location.reload()
      
    } catch (error) {
      console.error('❌ Error durante refresh:', error)
      // Si algo falla, aún así recargar la página
      window.location.reload()
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
          <ErrorDisplay error={error} onRetry={handleFullRefresh} />
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
 
 