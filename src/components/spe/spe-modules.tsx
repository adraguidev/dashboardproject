'use client'

import React, { useState } from 'react'
import { useSpeData } from '@/hooks/use-spe-data'
import { Loader2, AlertTriangle, BarChart3, Construction, TrendingUp } from 'lucide-react'
import { SpePendientesTable } from './spe-pendientes-table'
import { SpeProcessSummaryTable } from './spe-process-summary-table'
import { SpeIngresosView } from './spe-ingresos-view'

export function SpeModules() {
  const [selectedModule, setSelectedModule] = useState('pendientes')
  const [groupBy, setGroupBy] = useState<'anio' | 'trimestre' | 'mes'>('anio')
  const { data: apiResponse, isLoading, error } = useSpeData()

  const modules = [
    {
      id: 'pendientes',
      name: 'Pendientes',
      icon: BarChart3,
      status: 'active',
      color: 'text-purple-600',
    },
    // Aquí se pueden añadir futuros módulos para SPE
    {
      id: 'ingresos',
      name: 'Ingresos',
      icon: TrendingUp,
      status: 'active',
      color: 'text-blue-600',
    },
    {
      id: 'produccion',
      name: 'Producción',
      icon: Construction,
      status: 'coming-soon',
      color: 'text-gray-400',
    }
  ]
  
  const renderModuleContent = () => {
    if (isLoading) {
      return (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          <p className="ml-4 text-gray-600">Cargando datos de SPE...</p>
        </div>
      )
    }

    if (error) {
      return (
        <div className="m-4 p-4 border border-red-200 bg-red-50 rounded-lg">
          <div className="flex items-center text-red-700">
            <AlertTriangle className="h-5 w-5 mr-3" />
            <h3 className="font-semibold">Error al Cargar Datos de SPE</h3>
          </div>
          <p className="mt-2 text-red-600 text-sm">{error.message}</p>
        </div>
      )
    }

    switch (selectedModule) {
      case 'pendientes':
        return (
          <div className="p-6">
            <div className="bg-gray-50 p-4 sm:p-6 rounded-lg">
              <SpePendientesTable
                data={apiResponse?.data || []}
                periodos={apiResponse?.periodos || { anios: [], trimestres: [], meses: [] }}
                loading={isLoading}
                groupBy={groupBy}
                onGroupingChange={setGroupBy}
              />
              <SpeProcessSummaryTable groupBy={groupBy} />
            </div>
          </div>
        )
      case 'ingresos':
        return <SpeIngresosView />
      default:
        return (
          <div className="p-16 text-center text-gray-500">
            <Construction className="w-12 h-12 mx-auto mb-4" />
            <h3 className="text-lg font-semibold">Módulo en construcción</h3>
            <p>Esta funcionalidad para SPE estará disponible próximamente.</p>
          </div>
        )
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Pestañas de Módulos */}
      <div className="border-b border-gray-200/80 bg-gray-50/50">
        <div className="px-6 py-1">
          <nav className="flex space-x-1">
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
                    group flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200
                    ${isActive 
                      ? 'bg-white text-gray-900 shadow-sm border border-gray-200/80' 
                      : isDisabled
                        ? 'text-gray-400 cursor-not-allowed'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-white/60'
                    }
                  `}
                >
                  <IconComponent className={`
                    w-4 h-4 transition-colors
                    ${isActive ? module.color : 'text-gray-400 group-hover:text-gray-600'}
                  `} />
                  <span>{module.name}</span>
                  {isDisabled && (
                    <div className="w-1.5 h-1.5 bg-amber-400 rounded-full ml-1"></div>
                  )}
                </button>
              )
            })}
          </nav>
        </div>
      </div>

      {/* Contenido del Módulo */}
      <div className="flex-1 bg-white">
        {renderModuleContent()}
      </div>
    </div>
  )
} 