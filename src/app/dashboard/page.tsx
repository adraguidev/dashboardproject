'use client'

import { useState } from 'react'
import { useDashboard } from '@/hooks/use-dashboard'
import { DashboardHeader } from '@/components/dashboard/dashboard-header'
import { ProcessModules } from '@/components/dashboard/process-modules'
import { DatabaseStatus } from '@/components/dashboard/database-status'
import { ErrorDisplay } from '@/components/ui/error-boundary'

export default function DashboardPage() {
  const [selectedProcess, setSelectedProcess] = useState<'ccm' | 'prr'>('ccm')
  const [activeModule, setActiveModule] = useState('pendientes')

  const { isLoading, error, refreshData } = useDashboard()

  const handleProcessChange = (process: 'ccm' | 'prr') => {
    setSelectedProcess(process)
  }

  const handleModuleChange = (moduleId: string) => {
    setActiveModule(moduleId)
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
          <DatabaseStatus className="mb-6" />
          <ErrorDisplay error={error} onRetry={refreshData} />
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
        onRefresh={refreshData}
        loading={isLoading}
      />

      {/* Main Content Container - Balanced width */}
      <div className="max-w-6xl mx-auto px-6 py-6">
        {/* Status Bar - Compact */}
        <div className="mb-6">
          <DatabaseStatus />
        </div>

        {/* Main Content */}
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
 
 