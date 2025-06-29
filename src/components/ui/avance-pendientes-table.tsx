'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useAvancePendientes } from '@/hooks/use-avance-pendientes'
import { usePendientesReport } from '@/hooks/use-pendientes-report'
import { useEvaluadores } from '@/hooks/use-evaluadores'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { Activity, Users, Calendar, TrendingDown, Search, Filter, Download } from 'lucide-react'
import { Evaluador } from '@/types/dashboard'

interface AvancePendientesTableProps {
  className?: string
  proceso?: 'CCM' | 'PRR'
}

type TabType = 'general' | 'otros' | 'por-revisar'

interface OperadorHistorico {
  operador: string
  subEquipo: string
  colorClass?: string
  total: number
  ultimaFecha: number
  [fecha: string]: string | number | undefined
}

export default function AvancePendientesTable({ 
  className, 
  proceso: propProceso
}: AvancePendientesTableProps) {
  const [selectedProceso, setSelectedProceso] = useState<'CCM' | 'PRR'>(propProceso || 'CCM')
  const [activeTab, setActiveTab] = useState<TabType>('general')
  const [searchTerm, setSearchTerm] = useState('')
  const [subEquipoFilter, setSubEquipoFilter] = useState<string>('')

  const { data, isLoading, error } = useAvancePendientes(selectedProceso)
  
  // Obtener datos de pendientes actuales para el cruce de operadores
  const { report: reportData } = usePendientesReport({
    process: selectedProceso.toLowerCase() as 'ccm' | 'prr',
    groupBy: 'year',
    enabled: true,
    backgroundFetch: true
  })

  // Obtener evaluadores del otro proceso para comparación
  const otherProcess = selectedProceso === 'CCM' ? 'prr' : 'ccm'
  const { evaluadores: otherProcessEvaluadores } = useEvaluadores({
    process: otherProcess
  })

  // Sincronizar el proceso cuando cambia el prop
  useEffect(() => {
    if (propProceso && propProceso !== selectedProceso) {
      setSelectedProceso(propProceso)
    }
  }, [propProceso, selectedProceso])

  // Normalización mejorada para comparación
  const normalizeSimple = (name: string): string => {
    if (!name) return '';
    return name
      .toUpperCase()
      .replace(/[ÁÀÄÂ]/g, 'A')
      .replace(/[ÉÈËÊ]/g, 'E')
      .replace(/[ÍÌÏÎ]/g, 'I')
      .replace(/[ÓÒÖÔ]/g, 'O')
      .replace(/[ÚÙÜÛ]/g, 'U')
      .replace(/Ñ/g, 'N')
      .replace(/[^A-Z0-9]/g, '')
      .trim();
  };

  // Crear set de nombres normalizados del otro proceso
  const externalNombresEnBase = useMemo(() => {
    const nombres = (otherProcessEvaluadores || [])
      .filter(e => e && e.nombre_en_base) 
      .map(e => {
        const normalized = normalizeSimple(e.nombre_en_base);
        return normalized;
      });
    
    // Debug logs removidos para mejorar rendimiento
    
    return new Set(nombres);
  }, [otherProcessEvaluadores, otherProcess]);

  // Verificar si un operador existe en el proceso externo
  const isOperadorInExternos = useCallback((operador: string) => {
    const normalizedOperador = normalizeSimple(operador);
    if (!normalizedOperador) return false;

    // Buscar coincidencia exacta primero
    if (externalNombresEnBase.has(normalizedOperador)) {
      return true;
    }

    // Buscar coincidencias parciales (nombres truncados o variaciones)
    for (const externalName of externalNombresEnBase) {
      // Coincidencia si uno es prefijo del otro (mínimo 5 caracteres para evitar falsos positivos)
      if (normalizedOperador.length >= 5 && externalName.length >= 5) {
        if (externalName.startsWith(normalizedOperador) || normalizedOperador.startsWith(externalName)) {
          return true;
        }
      }
      
      // Coincidencia por similitud de palabras (al menos 2 palabras de 3+ caracteres en común)
      const operadorWords = normalizedOperador.split(/\s+/).filter(w => w.length >= 3);
      const externalWords = externalName.split(/\s+/).filter(w => w.length >= 3);
      
      if (operadorWords.length >= 2 && externalWords.length >= 2) {
        const commonWords = operadorWords.filter(word => 
          externalWords.some(extWord => extWord.includes(word) || word.includes(extWord))
        );
        if (commonWords.length >= 2) {
          return true;
        }
      }
    }
    
    return false;
  }, [externalNombresEnBase]);

  // Procesar datos históricos
  const processedData = useMemo(() => {
    if (!data?.success || !data.data || !reportData) {
      return { fechas: [], operadores: [], subEquipos: [] }
    }

    const { fechas: rawFechas, operadores } = data.data

    // Ordenar fechas de menor a mayor y corregir problema de zona horaria
    const fechasOrdenadas = rawFechas
      .map(fecha => {
        // Usar parseISO para evitar problemas de zona horaria
        const fechaCorrecta = parseISO(fecha + 'T12:00:00')
        return {
          original: fecha,
          parsed: fechaCorrecta,
          formatted: format(fechaCorrecta, 'dd/MM', { locale: es })
        }
      })
      .sort((a, b) => a.parsed.getTime() - b.parsed.getTime())

    // Crear mapa de operadores de pendientes actuales para obtener subEquipo y color
    const operadoresMap = new Map()
    if (reportData.data) {
      reportData.data.forEach(item => {
        if (item.operador !== 'Sin Operador') {
          operadoresMap.set(item.operador, {
            subEquipo: item.subEquipo || 'NO_ENCONTRADO',
            colorClass: item.colorClass || ''
          })
        }
      })
    }

    // Procesar operadores históricos
    const operadoresHistoricos: OperadorHistorico[] = operadores.map(op => {
      const operadorInfo = operadoresMap.get(op.operador) || {
        subEquipo: 'NO_ENCONTRADO',
        colorClass: ''
      }

      const operadorHistorico: OperadorHistorico = {
        operador: op.operador,
        subEquipo: operadorInfo.subEquipo,
        colorClass: operadorInfo.colorClass,
        total: Object.keys(op)
          .filter(key => key !== 'operador')
          .reduce((sum, fecha) => sum + (op[fecha] as number || 0), 0),
        ultimaFecha: 0 // Se calculará después
      }

      // Agregar datos de cada fecha
      fechasOrdenadas.forEach(({ original }) => {
        operadorHistorico[original] = op[original] as number || 0
      })

      return operadorHistorico
    })

    // Calcular y asignar el valor de la última fecha después de procesar todas las fechas
    const ultimaFechaKey = fechasOrdenadas[fechasOrdenadas.length - 1]?.original
    if (ultimaFechaKey) {
      operadoresHistoricos.forEach(op => {
        op.ultimaFecha = op[ultimaFechaKey] as number || 0
      })
    }

    // Ordenar operadores por cantidad de la última fecha (mayor a menor)
    operadoresHistoricos.sort((a, b) => b.ultimaFecha - a.ultimaFecha)
    
    // Debug logs removidos para mejorar rendimiento

    // Obtener sub equipos únicos
    const subEquipos = [...new Set(operadoresHistoricos.map(op => op.subEquipo))]
      .filter(se => se !== 'NO_ENCONTRADO')
      .sort()

    return {
      fechas: fechasOrdenadas,
      operadores: operadoresHistoricos,
      subEquipos
    }
  }, [data, reportData])

  // Filtrar operadores según la pestaña activa
  const filteredOperators = useMemo(() => {
    let filtered = []
    switch (activeTab) {
      case 'general':
        filtered = processedData.operadores.filter(item => item.subEquipo !== 'NO_ENCONTRADO')
        break
      case 'otros':
        filtered = processedData.operadores.filter(item => 
          item.subEquipo === 'NO_ENCONTRADO' && 
          !isOperadorInExternos(item.operador)
        )
        break
      case 'por-revisar':
        filtered = processedData.operadores.filter(item => 
          item.subEquipo === 'NO_ENCONTRADO' && 
          isOperadorInExternos(item.operador)
        )
        break
      default:
        filtered = processedData.operadores
    }

    // Aplicar filtro de búsqueda
    if (searchTerm) {
      filtered = filtered.filter(item => 
        item.operador.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Aplicar filtro de sub equipo
    if (subEquipoFilter && subEquipoFilter !== 'all') {
      filtered = filtered.filter(item => 
        item.subEquipo === subEquipoFilter
      )
    }

    // Mantener el ordenamiento por última fecha (mayor a menor)
    filtered.sort((a, b) => b.ultimaFecha - a.ultimaFecha)

    return filtered
  }, [processedData.operadores, activeTab, isOperadorInExternos, searchTerm, subEquipoFilter])

  // Configuración de pestañas
  const tabs: { id: TabType; name: string; count: number; description: string }[] = [
    { 
      id: 'general', 
      name: 'General', 
      count: processedData.operadores.filter(item => item.subEquipo !== 'NO_ENCONTRADO').length, 
      description: 'Operadores del proceso actual con sub-equipo asignado.' 
    },
    { 
      id: 'otros', 
      name: 'Otros', 
      count: processedData.operadores.filter(item => 
        item.subEquipo === 'NO_ENCONTRADO' && !isOperadorInExternos(item.operador)
      ).length, 
      description: 'Operadores no identificados en ninguna de las listas de procesos.' 
    },
    { 
      id: 'por-revisar', 
      name: 'Por Revisar', 
      count: processedData.operadores.filter(item => 
        item.subEquipo === 'NO_ENCONTRADO' && isOperadorInExternos(item.operador)
      ).length, 
      description: 'Operadores del proceso actual que se encontraron en la lista del proceso contrario.'
    },
  ]

  // Función para renderizar badge de sub equipo
  const renderSubEquipoBadge = (subEquipo: string) => {
    const displayText = subEquipo === 'NO_ENCONTRADO' ? 'N/A' : subEquipo
    const config: { [key: string]: { bgColor: string; textColor: string; borderColor: string; dotColor: string } } = {
      'EVALUACION': { bgColor: 'bg-blue-50', textColor: 'text-blue-800', borderColor: 'border-blue-200', dotColor: 'bg-blue-500' },
      'REASIGNADOS': { bgColor: 'bg-orange-50', textColor: 'text-orange-800', borderColor: 'border-orange-200', dotColor: 'bg-orange-500' },
      'SUSPENDIDA': { bgColor: 'bg-red-50', textColor: 'text-red-800', borderColor: 'border-red-200', dotColor: 'bg-red-500' },
      'RESPONSABLE': { bgColor: 'bg-green-50', textColor: 'text-green-800', borderColor: 'border-green-200', dotColor: 'bg-green-500' },
    }
    const style = config[subEquipo] || { bgColor: 'bg-gray-50', textColor: 'text-gray-800', borderColor: 'border-gray-200', dotColor: 'bg-gray-500' }

    return (
      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium shadow-sm ${style.bgColor} ${style.textColor} border ${style.borderColor}`}>
        <div className={`w-2 h-2 rounded-full mr-1.5 ${style.dotColor}`}></div>
        {displayText}
      </span>
    )
  }

  // Función para exportar CSV
  const exportToCSV = () => {
    const headers = ['OPERADOR', 'SUB EQUIPO', ...processedData.fechas.map(f => f.formatted), 'TOTAL']
    const csvData = [
      headers.join(','),
      ...filteredOperators.map(item => [
        `"${item.operador}"`,
        `"${item.subEquipo === 'NO_ENCONTRADO' ? 'N/A' : item.subEquipo}"`,
        ...processedData.fechas.map(f => item[f.original] || 0),
        item.total
      ].join(','))
    ]
    
    const blob = new Blob([csvData.join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `avance-pendientes-${activeTab}-${selectedProceso}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-600">Cargando avance de pendientes...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600">Error al cargar los datos: {error.message}</p>
      </div>
    )
  }

  if (!data?.success || !data.data || processedData.fechas.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">No hay datos históricos disponibles</p>
      </div>
    )
  }

  return (
    <div className={`bg-gray-50 p-4 sm:p-6 rounded-lg ${className}`}>
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6">
        <div className="flex items-center mb-4 lg:mb-0">
          <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-200 mr-4">
            <Activity className="h-6 w-6 text-orange-600" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-800">Avance de Pendientes</h3>
            <p className="text-sm text-gray-500">Histórico de pendientes por operador y fecha.</p>
          </div>
        </div>
        <div className="flex items-center text-sm text-gray-600 bg-white px-3 py-2 rounded-lg shadow-sm border border-gray-200">
          <Calendar className="h-4 w-4 mr-2" />
          {processedData.fechas.length} fechas registradas
        </div>
      </div>

      {/* Tabs System */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-orange-500 text-orange-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {`${tab.name} (${tab.count})`}
              </button>
            ))}
          </nav>
        </div>
        <div className="mt-2 text-sm text-gray-600">
          {tabs.find(tab => tab.id === activeTab)?.description}
        </div>
      </div>

      {/* Stats Summary */}
      <div className="mb-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex items-center">
          <div className="bg-indigo-100 p-3 rounded-full mr-4">
            <Users className="h-6 w-6 text-indigo-600" />
          </div>
          <div>
            <span className="text-sm text-gray-500 block">Operadores</span>
            <span className="text-2xl font-bold text-gray-900">{filteredOperators.length}</span>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex items-center">
          <div className="bg-orange-100 p-3 rounded-full mr-4">
            <TrendingDown className="h-6 w-6 text-orange-600" />
          </div>
          <div>
            <span className="text-sm text-gray-500 block">Última Fecha</span>
            <span className="text-lg font-bold text-gray-900">
              {processedData.fechas[processedData.fechas.length - 1]?.formatted || 'N/A'}
            </span>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex items-center">
          <div className="bg-green-100 p-3 rounded-full mr-4">
            <Activity className="h-6 w-6 text-green-600" />
          </div>
          <div>
            <span className="text-sm text-gray-500 block">Total Actual</span>
            <span className="text-2xl font-bold text-gray-900">
              {filteredOperators.reduce((sum, op) => sum + op.ultimaFecha, 0).toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="mb-4 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-3 flex-1">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Buscar operador..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-10 pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm"
            />
          </div>
          {activeTab === 'general' && (
            <div className="relative w-full sm:w-64">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none z-10" />
              <select
                value={subEquipoFilter}
                onChange={(e) => setSubEquipoFilter(e.target.value)}
                className="w-full h-10 pl-10 pr-8 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white text-sm appearance-none"
              >
                <option value="">Todos los sub equipos</option>
                {processedData.subEquipos.map(subEquipo => (
                  <option key={subEquipo} value={subEquipo}>
                    {subEquipo}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={exportToCSV}
            className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            <Download className="w-4 h-4 mr-2" />
            Exportar CSV
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full table-fixed">
            <thead className="bg-gray-50">
              <tr>
                <th className="sticky left-0 z-10 bg-gray-50 w-52 px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200">
                  <div className="flex items-center">
                    <Users className="h-4 w-4 mr-1.5 text-gray-400" />
                    <span>Operador</span>
                  </div>
                </th>
                <th className="w-36 px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <span>Sub Equipo</span>
                </th>
                {processedData.fechas.map(({ original, formatted }) => (
                  <th key={original} className="w-20 px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <div className="flex items-center justify-center">
                      <Calendar className="h-3.5 w-3.5 mr-1 text-gray-400" />
                      <span>{formatted}</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredOperators.length === 0 ? (
                <tr>
                  <td colSpan={processedData.fechas.length + 2} className="px-4 py-8 text-center text-gray-500">
                    No hay operadores que coincidan con los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                filteredOperators.map((operador, index) => (
                  <tr 
                    key={operador.operador}
                    className={`group transition-colors ${operador.colorClass || ''} hover:bg-gray-100`}
                  >
                    <td className={`sticky left-0 z-10 px-3 py-2 text-sm font-medium text-gray-900 border-r border-gray-200 transition-colors ${operador.colorClass || 'bg-white'} group-hover:bg-gray-100`}>
                      <div className="max-w-[200px] whitespace-normal leading-tight text-sm" title={operador.operador}>
                        {operador.operador}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-center">
                      {renderSubEquipoBadge(operador.subEquipo)}
                    </td>
                    {processedData.fechas.map(({ original }) => {
                      const valor = operador[original] as number || 0
                      return (
                        <td
                          key={original}
                          className="px-2 py-3 text-center text-sm text-gray-900"
                        >
                          <span
                            className={`inline-block px-1.5 py-1 rounded text-xs font-medium min-w-[40px] ${
                              valor === 0
                                ? 'bg-green-100 text-green-800'
                                : valor < 100
                                ? 'bg-yellow-100 text-yellow-800'
                                : valor < 500
                                ? 'bg-orange-100 text-orange-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {valor > 0 ? valor.toLocaleString() : '0'}
                          </span>
                        </td>
                      )
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Results info */}
      <div className="mt-4 text-sm text-gray-600">
        Mostrando {filteredOperators.length} operadores de {processedData.operadores.length} total
      </div>

      {/* Color Legend */}
      {reportData?.legend && (
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h4 className="text-sm font-medium text-gray-900 mb-3">Código de Colores por Sub Equipo:</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {reportData.legend.map(legend => (
              <div key={legend.subEquipo} className="flex items-center space-x-2">
                <div className={`w-4 h-4 rounded ${legend.colorClass}`}></div>
                <p className="text-xs text-gray-500">{legend.subEquipo} ({legend.count})</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Leyenda de rangos */}
      <div className="mt-4 p-4 bg-white rounded-lg border border-gray-200">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Leyenda de Rangos de Pendientes:</h4>
        <div className="flex flex-wrap gap-4 text-xs">
          <div className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 bg-green-100 border border-green-200 rounded"></span>
            <span className="text-gray-600">0 pendientes</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 bg-yellow-100 border border-yellow-200 rounded"></span>
            <span className="text-gray-600">1-99 pendientes</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 bg-orange-100 border border-orange-200 rounded"></span>
            <span className="text-gray-600">100-499 pendientes</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 bg-red-100 border border-red-200 rounded"></span>
            <span className="text-gray-600">500+ pendientes</span>
          </div>
        </div>
      </div>
    </div>
  )
} 