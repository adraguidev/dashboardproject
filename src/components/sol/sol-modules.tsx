'use client'

import React, { useState, useEffect } from 'react'
import { Loader2, AlertTriangle, BarChart3, Construction, TrendingUp, Activity, ClipboardList } from 'lucide-react'
import { useSolData } from '@/hooks/use-sol-data'
import { useSolProduccion } from '@/hooks/use-sol-produccion'
import { SolPendientesTable } from './sol-pendientes-table'
import { SolEstadoSummaryTable } from './sol-estado-summary-table'
import { SolIngresosView } from './sol-ingresos-view'
import SolAvancePendientesTable from './sol-avance-pendientes-table'
import { SolProduccionTable } from './sol-produccion-table'
import { SolAsignacionesTable } from './sol-asignaciones-table'
import { motion, AnimatePresence } from 'framer-motion'
import { SectionCard } from '@/components/ui/section-card'

declare global {
  interface Window {
    posthog?: {
      capture: (event: string, properties?: Record<string, any>) => void
    }
  }
}

export function SolModules() {
  const [selectedModule, setSelectedModule] = useState('pendientes')
  const [groupBy, setGroupBy] = useState<'anio' | 'trimestre' | 'mes'>('anio')
  const [produccionGroupBy, setProduccionGroupBy] = useState<'fechas' | 'meses'>('fechas')
  const { data: apiResponse, isLoading, error } = useSolData()
  const { data: produccionData, isLoading: isLoadingProduccion, error: produccionError } = useSolProduccion()

  const modules = [
    {
      id: 'pendientes',
      name: 'Pendientes',
      icon: BarChart3,
      status: 'active',
      color: 'text-blue-600',
    },
    {
      id: 'ingresos',
      name: 'Ingresos',
      icon: TrendingUp,
      status: 'active',
      color: 'text-blue-600',
    },
    {
      id: 'avance-pendientes',
      name: 'Avance Pendientes',
      icon: Activity,
      status: 'active',
      color: 'text-orange-600',
    },
    {
      id: 'produccion',
      name: 'Producción',
      icon: Construction,
      status: 'active',
      color: 'text-green-600',
    },
    {
      id: 'asignaciones',
      name: 'Asignaciones',
      icon: ClipboardList,
      status: 'active',
      color: 'text-blue-600',
    }
  ]
  
  // Track tab changes with PostHog
  useEffect(() => {
    const activeModule = modules.find(m => m.id === selectedModule)
    if (activeModule && typeof window !== 'undefined' && window.posthog) {
      window.posthog.capture('cambio_pestana', {
        modulo_id: activeModule.id,
        modulo_nombre: activeModule.name,
        contexto: 'SOL'
      })
    }
  }, [selectedModule])

  const renderModuleContent = () => {
    if (isLoading) {
      return (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          <p className="ml-4 text-gray-600">Cargando datos de SOL...</p>
        </div>
      )
    }

    if (error) {
      return (
        <div className="m-4 p-4 border border-red-200 bg-red-50 rounded-lg">
          <div className="flex items-center text-red-700">
            <AlertTriangle className="h-5 w-5 mr-3" />
            <h3 className="font-semibold">Error al Cargar Datos de SOL</h3>
          </div>
          <p className="mt-2 text-red-600 text-sm">{error.message}</p>
        </div>
      )
    }

    switch (selectedModule) {
      case 'pendientes':
        return (
          <div className="p-6">
            <SectionCard>
              <SolPendientesTable
                data={apiResponse?.data || []}
                periodos={apiResponse?.periodos || { anios: [], trimestres: [], meses: [] }}
                loading={isLoading}
                className="w-full"
                groupBy={groupBy}
                onGroupingChange={setGroupBy}
              />
              <SolEstadoSummaryTable groupBy={groupBy} />
            </SectionCard>
          </div>
        )
      case 'ingresos':
        return (
          <div className="p-6">
            <SolIngresosView />
          </div>
        )
      case 'avance-pendientes':
        return (
          <div className="p-6">
            <SolAvancePendientesTable />
          </div>
        )
      case 'produccion':
        return (
          <div className="p-6">
            <SectionCard>
              <SolProduccionTable
                data={produccionData?.data || []}
                periodos={produccionData?.periodos || { fechas: [], meses: [], anios: [] }}
                loading={isLoadingProduccion}
                className="w-full"
                groupBy={produccionGroupBy}
                onGroupingChange={setProduccionGroupBy}
              />
            </SectionCard>
          </div>
        )
      case 'asignaciones':
        return (
          <div className="p-6">
            <SolAsignacionesTable />
          </div>
        )
      default:
        return (
          <div className="p-16 text-center text-gray-500">
            <Construction className="w-12 h-12 mx-auto mb-4" />
            <h3 className="text-lg font-semibold">Módulo en construcción</h3>
            <p>Esta funcionalidad para SOL estará disponible próximamente.</p>
          </div>
        )
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Modern Tabs */}
      <div className="border-b border-gray-200/80 bg-gray-50/50">
        <div className="px-6 py-1">
          {/* Desktop Tabs */}
          <nav className="hidden md:flex space-x-1 relative">
            {modules.map((module) => {
              const IconComponent = module.icon
              const isActive = selectedModule === module.id
              const isDisabled = module.status === 'coming-soon'
              return (
                <button
                  key={module.id}
                  onClick={() => !isDisabled && setSelectedModule(module.id)}
                  disabled={isDisabled}
                  className={`
                    group relative flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 z-10
                    ${isActive 
                      ? 'text-gray-900' 
                      : isDisabled
                        ? 'text-gray-400 cursor-not-allowed'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-white/60'
                    }
                  `}
                >
                  {isActive && (
                    <motion.div
                      layoutId="active-tab-indicator"
                      className="absolute inset-0 bg-white rounded-lg shadow-sm border border-gray-200/80"
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    />
                  )}
                  <span className="relative z-10 flex items-center gap-2">
                    <IconComponent className={`
                      w-4 h-4 transition-colors
                      ${isActive ? module.color : 'text-gray-400 group-hover:text-gray-600'}
                    `} />
                    <span>{module.name}</span>
                  </span>
                  {module.status === 'coming-soon' && module.id !== selectedModule && (
                    <div className="w-1.5 h-1.5 bg-amber-400 rounded-full"></div>
                  )}
                </button>
              )
            })}
          </nav>
          {/* Mobile Select */}
          <div className="block md:hidden py-2">
            <select
              id="module-select"
              value={selectedModule}
              onChange={(e) => setSelectedModule(e.target.value)}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-base font-medium text-gray-700"
            >
              {modules.map((module) => (
                <option key={module.id} value={module.id} disabled={module.status === 'coming-soon'}>
                  {module.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 bg-white overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={selectedModule}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
          >
            {renderModuleContent()}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
} 