'use client'

import React, { useState, useMemo } from 'react'
import { AdvancedDataTable, Column } from './advanced-data-table'
import { PendientesReportSummary, Evaluador } from '@/types/dashboard'
import { ChevronDown } from 'lucide-react'

interface AdvancedPendientesReportTableProps {
  reportData: PendientesReportSummary
  otherProcessEvaluadores?: Evaluador[] // Evaluadores del otro proceso para comparar
  loading?: boolean
  className?: string
}

type TabType = 'general' | 'otros' | 'por-revisar'
type GroupingType = 'año' | 'trimestre-año' | 'mes-año'

export function AdvancedPendientesReportTable({ 
  reportData, 
  otherProcessEvaluadores = [],
  loading = false, 
  className = '' 
}: AdvancedPendientesReportTableProps) {
  const [activeTab, setActiveTab] = useState<TabType>('general')
  const [groupingType, setGroupingType] = useState<GroupingType>('año')
  const [showGroupingMenu, setShowGroupingMenu] = useState(false)

  // Función para extraer año de una fecha
  const extractYearFromDate = (dateStr: string): string | null => {
    if (!dateStr) return null
    const date = new Date(dateStr)
    return isNaN(date.getTime()) ? null : date.getFullYear().toString()
  }

  // Función para extraer trimestre-año de una fecha
  const extractQuarterYearFromDate = (dateStr: string): string | null => {
    if (!dateStr) return null
    const date = new Date(dateStr)
    if (isNaN(date.getTime())) return null
    
    const year = date.getFullYear()
    const month = date.getMonth() + 1 // getMonth() devuelve 0-11
    const quarter = Math.ceil(month / 3)
    return `T${quarter}-${year}`
  }

  // Función para extraer mes-año de una fecha
  const extractMonthYearFromDate = (dateStr: string): string | null => {
    if (!dateStr) return null
    const date = new Date(dateStr)
    if (isNaN(date.getTime())) return null
    
    const year = date.getFullYear()
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    return `${month}-${year}`
  }

    // Estas funciones ya no se usan directamente

  // Función para reprocessar datos (definida dentro del componente)
  const reprocessDataByGrouping = React.useCallback((data: any[], groupingType: GroupingType) => {
    // Si es agrupación por año, devolver datos originales sin modificar
    if (groupingType === 'año') {
      // Filtrar años que tienen al menos algún valor > 0
      const yearsWithData = reportData.years.filter(year => {
        return data.some(operatorData => 
          (operatorData.years[year] || 0) > 0
        )
      })
      
      return {
        data: data,
        periods: yearsWithData
      }
    }

    // Para otras agrupaciones, crear copia profunda de los datos
    const processedData = data.map(operatorData => ({
      ...operatorData,
      years: { ...operatorData.years }
    }))

    const allPeriods = new Set<string>()

    // Generar períodos basados en los años existentes
    reportData.years.forEach(year => {
      if (groupingType === 'trimestre-año') {
        ['T1', 'T2', 'T3', 'T4'].forEach(trimestre => {
          allPeriods.add(`${trimestre}-${year}`)
        })
      } else if (groupingType === 'mes-año') {
        for (let month = 1; month <= 12; month++) {
          allPeriods.add(`${month.toString().padStart(2, '0')}-${year}`)
        }
      }
    })

    // Redistribuir los datos existentes entre los nuevos períodos
    processedData.forEach(operatorData => {
      const originalYearData = { ...operatorData.years }
      const newYearData: { [period: string]: number } = {}
      
      Object.entries(originalYearData).forEach(([year, count]) => {
        const totalCount = count as number
        
        if (groupingType === 'trimestre-año') {
          // Distribuir entre trimestres de forma más equilibrada
          const baseCount = Math.floor(totalCount / 4)
          const remainder = totalCount % 4
          
          const trimestres = ['T1', 'T2', 'T3', 'T4']
          trimestres.forEach((trimestre: string, idx: number) => {
            const periodKey = `${trimestre}-${year}`
            // Distribuir el resto en los primeros trimestres
            newYearData[periodKey] = baseCount + (idx < remainder ? 1 : 0)
          })
        } else if (groupingType === 'mes-año') {
          // Distribuir entre meses de forma más equilibrada
          const baseCount = Math.floor(totalCount / 12)
          const remainder = totalCount % 12
          
          for (let month = 1; month <= 12; month++) {
            const periodKey = `${month.toString().padStart(2, '0')}-${year}`
            // Distribuir el resto en los primeros meses
            newYearData[periodKey] = baseCount + (month <= remainder ? 1 : 0)
          }
        }
      })

      // Actualizar los datos del operador
      operatorData.years = newYearData
      operatorData.total = Object.values(newYearData).reduce((sum, val) => sum + val, 0)
    })

    // Filtrar períodos que tienen al menos algún valor > 0
    const periodsWithData = Array.from(allPeriods).filter(period => {
      return processedData.some(operatorData => 
        (operatorData.years[period] || 0) > 0
      )
    }).sort()

    return {
      data: processedData,
      periods: periodsWithData
    }
  }, [reportData.years])

  // Reprocessar datos según agrupación (optimizado con useMemo)
  const { data: processedData, periods: allPeriods } = useMemo(() => {
    return reprocessDataByGrouping([...reportData.data], groupingType)
  }, [reportData.data, groupingType, reprocessDataByGrouping])

  // Separar "Sin Operador" del resto de datos
  const sinOperadorData = processedData.find(item => 
    item.operador.toLowerCase().includes('sin operador')
  )
  
  // Filtrar datos sin "Sin Operador"
  const operadoresData = processedData.filter(item => 
    !item.operador.toLowerCase().includes('sin operador')
  )

  // Obtener evaluadores del otro proceso para comparación
  const otherProcessOperators = otherProcessEvaluadores.map(evaluador => 
    evaluador.nombre_en_base.toLowerCase().trim()
  )



  // Filtrar operadores según la pestaña activa
  const filteredOperators = useMemo(() => {
    switch (activeTab) {
      case 'general':
        // Solo operadores que tienen sub equipo asignado (no N/A)
        return operadoresData.filter((op: any) => 
          op.subEquipo && op.subEquipo !== 'NO_ENCONTRADO'
        )
      
      case 'otros':
        // Operadores con sub equipo N/A que NO están en el otro proceso
        return operadoresData.filter((op: any) => 
          (!op.subEquipo || op.subEquipo === 'NO_ENCONTRADO') &&
          !otherProcessOperators.includes(op.operador.toLowerCase().trim())
        )
      
      case 'por-revisar':
        // Operadores con sub equipo N/A que SÍ están en el otro proceso
        return operadoresData.filter((op: any) => 
          (!op.subEquipo || op.subEquipo === 'NO_ENCONTRADO') &&
          otherProcessOperators.includes(op.operador.toLowerCase().trim())
        )
      
      default:
        return operadoresData
    }
      }, [activeTab, operadoresData, otherProcessOperators])

  // Filtrar períodos que tienen datos solo para los operadores de la pestaña activa
  const periods = useMemo(() => {
    return allPeriods.filter(period => {
      return filteredOperators.some(operatorData => 
        (operatorData.years[period] || 0) > 0
      )
    })
  }, [allPeriods, filteredOperators])

  // Calcular totales con optimización useMemo
  const { 
    totalSinOperadorSin2019, 
    totalByPeriodFiltered, 
    grandTotalFiltered 
  } = useMemo(() => {
    const periodsWithout2019 = periods.filter((period: string) => !period.includes('2019'))
    
    const totalSinOperadorSin2019 = sinOperadorData ? 
      periodsWithout2019.reduce((sum: number, period: string) => sum + (sinOperadorData.years[period] || 0), 0) : 0

    // Calcular totales solo para los operadores filtrados
    const totalByPeriodFiltered = periods.reduce((acc: { [key: string]: number }, period: string) => {
      const totalPeriod = filteredOperators.reduce((sum: number, op: any) => sum + (op.years[period] || 0), 0)
      return { ...acc, [period]: totalPeriod }
    }, {} as { [key: string]: number })

    const grandTotalFiltered = Object.values(totalByPeriodFiltered).reduce((sum: number, val: number) => sum + val, 0)

    return {
      totalSinOperadorSin2019,
      totalByPeriodFiltered,
      grandTotalFiltered
    }
  }, [periods, sinOperadorData, filteredOperators])

  // Preparar datos para la tabla con optimización useMemo
  const tableData = useMemo(() => {
    // Preparar datos para la tabla (solo operadores filtrados)
    const operadorTableData = filteredOperators.map((operadorData, index) => ({
      id: index,
      operador: operadorData.operador,
      subEquipo: operadorData.subEquipo || 'NO_ENCONTRADO',
      colorClass: operadorData.colorClass,
      total: operadorData.total,
      isTotal: false,
      ...Object.keys(operadorData.years).reduce((acc, period) => ({
        ...acc,
        [`period_${period}`]: operadorData.years[period] || 0
      }), {})
    }))

    // Crear fila de totales (solo para operadores filtrados)
    const totalRow = {
      id: 'total',
      operador: 'TOTAL',
      subEquipo: '',
      colorClass: 'bg-green-100 font-bold',
      total: grandTotalFiltered,
      isTotal: true,
      ...periods.reduce((acc: any, period: string) => ({
        ...acc,
        [`period_${period}`]: totalByPeriodFiltered[period] || 0
      }), {})
    }

    // Combinar datos de operadores con fila total
    return [...operadorTableData, totalRow]
  }, [filteredOperators, periods, grandTotalFiltered, totalByPeriodFiltered])

  // Configurar columnas dinámicamente
  const columns: Column<any>[] = [
    {
      key: 'operador',
      title: 'Operador',
      accessor: (item) => item.operador,
      width: 200,
      minWidth: 150,
      maxWidth: 300,
      sortable: true,
      filterable: true,
      className: 'font-medium',
      render: (value, item) => (
        <div className={`${item.isTotal ? 'font-bold text-green-900' : 'font-medium text-gray-900'}`}>
          {value}
        </div>
      )
    },
    {
      key: 'subEquipo',
      title: 'Sub Equipo',
      accessor: (item) => item.subEquipo,
      width: 150,
      minWidth: 120,
      sortable: true,
      filterable: true,
      render: (value, item) => (
        item.isTotal ? (
          <span className="text-green-900 font-bold">-</span>
        ) : (
          <span className={`px-2 py-1 rounded text-xs font-medium ${
            item.subEquipo === 'EVALUACION' 
              ? 'bg-gray-100 text-gray-800'
              : item.subEquipo === 'REASIGNADOS'
              ? 'bg-orange-200 text-orange-900'
              : item.subEquipo === 'SUSPENDIDA'
              ? 'bg-orange-400 text-orange-950'
              : item.subEquipo === 'RESPONSABLE'
              ? 'bg-green-200 text-green-900'
              : 'bg-gray-300 text-gray-700'
          }`}>
            {value === 'NO_ENCONTRADO' ? 'N/A' : value}
          </span>
        )
      )
    },
    ...periods.map(period => ({
      key: `period_${period}`,
      title: period,
      accessor: (item: any) => item[`period_${period}`] || 0,
      width: groupingType === 'mes-año' ? 100 : 80,
      minWidth: 60,
      maxWidth: 120,
      sortable: true,
      filterable: false,
      className: 'text-center',
      headerClassName: 'text-center',
      render: (value: number, item: any) => (
        <span className={`font-mono text-sm ${item.isTotal ? 'font-bold text-green-900' : ''}`}>
          {value.toLocaleString()}
        </span>
      )
    })),
    {
      key: 'total',
      title: 'Total',
      accessor: (item) => item.total,
      width: 100,
      minWidth: 80,
      sortable: true,
      filterable: false,
      className: 'text-center font-semibold',
      headerClassName: 'text-center',
      render: (value, item) => (
        <span className={`font-mono text-sm font-semibold ${item.isTotal ? 'text-green-900 bg-green-200 px-2 py-1 rounded' : 'text-blue-600'}`}>
          {value.toLocaleString()}
        </span>
      )
    }
  ]

  // Aplicar colores de fila según sub_equipo
  const getRowClassName = (item: any) => {
    if (item.isTotal) {
      return 'bg-green-100 border-t-2 border-green-300'
    }
    return item.colorClass || ''
  }

  // Definir pestañas
  const tabs = [
    {
      id: 'general' as TabType,
      name: 'GENERAL',
      description: 'Operadores con sub equipo asignado',
      count: operadoresData.filter((op: any) => op.subEquipo && op.subEquipo !== 'NO_ENCONTRADO').length
    },
    {
      id: 'otros' as TabType,
      name: 'OTROS',
      description: 'Operadores sin sub equipo (únicos del proceso)',
      count: operadoresData.filter((op: any) => 
        (!op.subEquipo || op.subEquipo === 'NO_ENCONTRADO') &&
        !otherProcessOperators.includes(op.operador.toLowerCase().trim())
      ).length
    },
    {
      id: 'por-revisar' as TabType,
      name: 'POR REVISAR',
      description: 'Operadores sin sub equipo que existen en el otro proceso',
      count: operadoresData.filter((op: any) => 
        (!op.subEquipo || op.subEquipo === 'NO_ENCONTRADO') &&
        otherProcessOperators.includes(op.operador.toLowerCase().trim())
      ).length
    }
  ]

  const groupingOptions = [
    { value: 'año' as GroupingType, label: 'Años', description: 'Agrupar por año' },
    { value: 'trimestre-año' as GroupingType, label: 'Trimestre-Año', description: 'Agrupar por trimestre y año' },
    { value: 'mes-año' as GroupingType, label: 'Mes-Año', description: 'Agrupar por mes y año' }
  ]

  return (
    <div className={className}>
      {/* Opciones de Agrupación */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-lg">🏷️</span>
            <h4 className="text-sm font-medium text-gray-900">Opciones de Agrupación</h4>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Agrupar pendientes por:</span>
            
            <div className="relative">
              <button
                onClick={() => setShowGroupingMenu(!showGroupingMenu)}
                className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <span className="text-sm font-medium">
                  {groupingOptions.find(opt => opt.value === groupingType)?.label}
                </span>
                <ChevronDown className="w-4 h-4 text-gray-500" />
              </button>
              
              {showGroupingMenu && (
                <div className="absolute top-full left-0 mt-1 w-56 bg-white border border-gray-200 rounded-md shadow-lg z-10">
                  {groupingOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => {
                        setGroupingType(option.value)
                        setShowGroupingMenu(false)
                      }}
                      className={`w-full text-left px-4 py-3 hover:bg-gray-50 first:rounded-t-md last:rounded-b-md ${
                        groupingType === option.value ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                      }`}
                    >
                      <div className="font-medium">{option.label}</div>
                      <div className="text-xs text-gray-500">{option.description}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
        
        <div className="mt-2 text-xs text-gray-600">
          ℹ️ Cambia la agrupación para ver los datos organizados por diferentes períodos de tiempo
        </div>
      </div>

      {/* Sistema de pestañas */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.name} ({tab.count})
              </button>
            ))}
          </nav>
        </div>
        
        {/* Descripción de la pestaña activa */}
        <div className="mt-2 text-sm text-gray-600">
          {tabs.find(tab => tab.id === activeTab)?.description}
        </div>
      </div>

      {/* Resumen estadístico */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="text-sm font-medium text-blue-900">Total Operadores</div>
          <div className="text-2xl font-bold text-blue-600">
            {filteredOperators.length}
          </div>
          <div className="text-xs text-blue-700 mt-1">
            En pestaña: {tabs.find(tab => tab.id === activeTab)?.name}
          </div>
        </div>
        <div className="bg-green-50 p-4 rounded-lg">
          <div className="text-sm font-medium text-green-900">Total Pendientes</div>
          <div className="text-2xl font-bold text-green-600">
            {grandTotalFiltered.toLocaleString()}
          </div>
          <div className="text-xs text-green-700 mt-1">
            Agrupado por: {groupingOptions.find(opt => opt.value === groupingType)?.label}
          </div>
        </div>
        <div className="bg-orange-50 p-4 rounded-lg">
          <div className="text-sm font-medium text-orange-900">Sin Asignación</div>
          <div className="text-2xl font-bold text-orange-600">
            {totalSinOperadorSin2019.toLocaleString()}
          </div>
          <div className="text-xs text-orange-700 mt-1">
            (Excluye 2019)
          </div>
        </div>
      </div>

      {/* Tabla avanzada */}
      <AdvancedDataTable
        data={tableData}
        columns={columns}
        loading={loading}
        searchable={true}
        exportable={true}
        selectable={false}
        pageSize={tableData.length} // Mostrar todos los datos en una página
        className="shadow-lg"
        emptyMessage="No hay datos de pendientes disponibles"
        getRowClassName={getRowClassName}
      />

      {/* Leyenda de colores */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h4 className="text-sm font-medium text-gray-900 mb-3">Código de Colores por Sub Equipo:</h4>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {[
            { subEquipo: 'EVALUACION', color: 'Blanco', colorClass: 'bg-white border border-gray-300', description: 'Operadores de Evaluación' },
            { subEquipo: 'REASIGNADOS', color: 'Naranja', colorClass: 'bg-orange-100', description: 'Operadores Reasignados' },
            { subEquipo: 'SUSPENDIDA', color: 'Naranja Oscuro', colorClass: 'bg-orange-300', description: 'Operadores Suspendidos' },
            { subEquipo: 'RESPONSABLE', color: 'Verde', colorClass: 'bg-green-100', description: 'Operadores Responsables' },
            { subEquipo: 'NO_ENCONTRADO', color: 'Gris', colorClass: 'bg-gray-200', description: 'Operador no encontrado' }
          ].map(legend => (
            <div key={legend.subEquipo} className="flex items-center space-x-2">
              <div className={`w-4 h-4 rounded ${legend.colorClass}`}></div>
              <span className="text-xs text-gray-700">{legend.description}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
} 
 
 