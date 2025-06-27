'use client'

import React, { useState, useEffect } from 'react'
import { Card } from '../ui/card'
import { PendientesReportTable } from '../ui/pendientes-report-table'
import { AdvancedPendientesReportTable } from '../ui/advanced-pendientes-report-table'
import { ProduccionReportTable } from '../ui/produccion-report-table'
import { IngresosChart } from '../ui/ingresos-chart'
import { usePendientesReport } from '@/hooks/use-pendientes-report'
import { useProduccionReport } from '@/hooks/use-produccion-report'
import { useIngresos } from '@/hooks/use-ingresos'
import { useEvaluadores } from '@/hooks/use-evaluadores'
import { BarChart3, CheckCircle, Clock, TrendingUp, Construction, Factory, TrendingDown } from 'lucide-react'

interface ProcessModulesProps {
  selectedProcess: 'ccm' | 'prr'
  selectedModule: string
  onModuleChange: (module: string) => void
  onRefresh?: () => Promise<void>
  moduleRefreshRef?: React.MutableRefObject<(() => Promise<void>) | null>
}

export function ProcessModules({ 
  selectedProcess, 
  selectedModule, 
  onModuleChange,
  onRefresh,
  moduleRefreshRef
}: ProcessModulesProps) {
  const { report: reportData, loading, error, groupBy, changeGrouping, refreshData: refreshPendientes } = usePendientesReport({
    process: selectedProcess,
    groupBy: 'year',
    enabled: selectedModule === 'pendientes',
    backgroundFetch: true
  })

  const { report: produccionReport, otherProcessEvaluadores: produccionOtherEvaluadores, loading: produccionLoading, error: produccionError, refetch: refetchProduccion } = useProduccionReport({
    process: selectedProcess,
    enabled: selectedModule === 'produccion',
    backgroundFetch: true
  })

  const { 
    report: ingresosReport, 
    isLoading: ingresosLoading, 
    error: ingresosError, 
    updatePeriod: updateIngresosPeriod,
    refreshData: refreshIngresos
  } = useIngresos({
    process: selectedProcess,
    enabled: selectedModule === 'ingresos',
    backgroundFetch: true
  })

  // Obtener evaluadores del otro proceso para comparación
  const otherProcess = selectedProcess === 'ccm' ? 'prr' : 'ccm'
  const { evaluadores: otherProcessEvaluadores } = useEvaluadores({
    process: otherProcess
  })

  // Registrar función de refresh específica del módulo activo
  useEffect(() => {
    const refreshCurrentModule = async () => {
      console.log(`🔄 Refrescando módulo activo: ${selectedModule} para ${selectedProcess.toUpperCase()}`);
      
      switch (selectedModule) {
        case 'pendientes':
          await refreshPendientes();
          break;
        case 'ingresos':
          await refreshIngresos();
          break;
        case 'produccion':
          await refetchProduccion();
          break;
        default:
          console.log(`ℹ️ Módulo ${selectedModule} no requiere refresh`);
      }
    };
    
    // Configurar la referencia para que el componente padre pueda llamar la función
    if (moduleRefreshRef) {
      moduleRefreshRef.current = refreshCurrentModule;
    }
    
    // Cleanup: limpiar la referencia cuando el componente se desmonte o cambie
    return () => {
      if (moduleRefreshRef) {
        moduleRefreshRef.current = null;
      }
    };
  }, [selectedModule, selectedProcess, moduleRefreshRef, refreshPendientes, refreshIngresos, refetchProduccion]);

  const modules = [
    {
      id: 'pendientes',
      name: 'Pendientes',
      icon: BarChart3,
      description: 'Análisis de expedientes pendientes',
      status: 'active',
      color: 'text-blue-600'
    },
    {
      id: 'ingresos',
      name: 'Ingresos',
      icon: TrendingDown,
      description: 'Gráfico de ingreso de expedientes por fecha',
      status: 'active',
      color: 'text-indigo-600'
    },
    {
      id: 'produccion',
      name: 'Producción',
      icon: Factory,
      description: 'Expedientes procesados (últimos 20 días)',
      status: 'active',
      color: 'text-green-600'
    },
    {
      id: 'resueltos',
      name: 'Resueltos',
      icon: CheckCircle,
      description: 'Expedientes completados',
      status: 'coming-soon',
      color: 'text-emerald-600'
    },
    {
      id: 'tiempos',
      name: 'Tiempos',
      icon: Clock,
      description: 'Análisis temporal',
      status: 'coming-soon',
      color: 'text-amber-600'
    },
    {
      id: 'productividad',
      name: 'Productividad',
      icon: TrendingUp,
      description: 'Métricas de rendimiento',
      status: 'coming-soon',
      color: 'text-purple-600'
    }
  ]

  const renderModuleContent = () => {
    switch (selectedModule) {
      case 'pendientes':
        return (
          <div className="p-6">
            {reportData ? (
              <AdvancedPendientesReportTable
                reportData={reportData}
                otherProcessEvaluadores={otherProcessEvaluadores}
                loading={loading}
                className="w-full"
                groupBy={groupBy}
                onGroupingChange={changeGrouping}
              />
            ) : (
              <PendientesReportTable
                report={reportData}
                loading={loading}
                error={error}
                className="w-full"
              />
            )}
          </div>
        )

      case 'ingresos':
        return (
          <div className="p-6">
            <IngresosChart
              report={ingresosReport}
              loading={ingresosLoading}
              error={ingresosError}
              className="w-full"
              onPeriodChange={(days) => {
                updateIngresosPeriod(days)
              }}
            />
          </div>
        )

      case 'produccion':
        return (
          <div className="p-6">
            <ProduccionReportTable
              report={produccionReport}
              otherProcessEvaluadores={produccionOtherEvaluadores}
              loading={produccionLoading}
              error={produccionError}
              className="w-full"
              onFiltersChange={(days, dayType) => {
                console.log(`🔄 Cambiando filtros: ${days} días, tipo: ${dayType}`)
                refetchProduccion(days, dayType)
              }}
            />
          </div>
        )
      
      default:
        const module = modules.find(m => m.id === selectedModule)
        const IconComponent = module?.icon || Construction
        
        return (
          <div className="p-16 text-center">
            <div className="flex flex-col items-center gap-4">
              <div className={`p-4 rounded-full bg-gray-50 ${module?.color || 'text-gray-400'}`}>
                <IconComponent className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {module?.name || 'Módulo'} en Desarrollo
                </h3>
                <p className="text-gray-600 max-w-md">
                  Estamos trabajando en esta funcionalidad. Será lanzada próximamente con análisis avanzado y visualizaciones interactivas.
                </p>
              </div>
              <div className="flex items-center gap-2 mt-4 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-full">
                <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></div>
                <span className="text-xs font-medium text-amber-700">Próximamente</span>
              </div>
            </div>
          </div>
        )
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Modern Tabs */}
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
                  onClick={() => !isDisabled && onModuleChange(module.id)}
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
                  
                  {module.status === 'coming-soon' && module.id !== selectedModule && (
                    <div className="w-1.5 h-1.5 bg-amber-400 rounded-full"></div>
                  )}
                  
                  {isActive && (
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                  )}
                </button>
              )
            })}
          </nav>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 bg-white">
        {renderModuleContent()}
      </div>
    </div>
  )
} 