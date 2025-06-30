'use client'

import React, { useState, useMemo, useCallback } from 'react'
import { PendientesReportSummary, Evaluador, PendientesReportData } from '@/types/dashboard'
import { BarChart, Calendar, Users, FileStack, AlertTriangle, Search, Download, Filter } from 'lucide-react'
import { Card } from '@/components/ui/card'

interface AdvancedPendientesReportTableProps {
  reportData: PendientesReportSummary | null
  otherProcessEvaluadores?: Evaluador[]
  loading?: boolean
  error?: string | null
  className?: string
  groupBy: 'quarter' | 'month' | 'year'
  onGroupingChange: (newGroupBy: 'quarter' | 'month' | 'year') => void
}

type TabType = 'general' | 'otros' | 'por-revisar'

export function AdvancedPendientesReportTable({ 
  reportData, 
  otherProcessEvaluadores = [],
  loading = false, 
  error = null,
  className = '',
  groupBy,
  onGroupingChange
}: AdvancedPendientesReportTableProps) {
  const [activeTab, setActiveTab] = useState<TabType>('general')
  const [searchTerm, setSearchTerm] = useState('')
  const [subEquipoFilter, setSubEquipoFilter] = useState<string>('')

  // A simple normalization for comparison: uppercase and alphanumeric.
  const normalizeSimple = (name: string): string => {
    if (!name) return '';
    return name.toUpperCase().replace(/[^A-Z0-9]/g, '');
  };

  // Create a set of normalized names from the 'nombre_en_base' property for fast lookup.
  const externalNombresEnBase = useMemo(() =>
    new Set(
      otherProcessEvaluadores
        .filter(e => e && e.nombre_en_base) 
        .map(e => normalizeSimple(e.nombre_en_base))
    )
  , [otherProcessEvaluadores]);

  // Check if an operator from the report exists in the external list.
  const isOperadorInExternos = useCallback((operador: string) => {
    const normalizedOperador = normalizeSimple(operador);
    if (!normalizedOperador) return false;

    // To handle truncated names, check if any external name starts with the operator name or vice-versa.
    for (const externalName of externalNombresEnBase) {
      if (externalName.startsWith(normalizedOperador) || normalizedOperador.startsWith(externalName)) {
        return true;
      }
    }
    return false;
  }, [externalNombresEnBase]);

  // Base data without 'Sin Operador'
  const baseData = useMemo(() => reportData?.data.filter(item => item.operador !== 'Sin Operador') || [], [reportData]);

  // Data for 'Sin Asignar' card
  const sinAsignarCount = useMemo(() => {
    const sinOperadorEntry = reportData?.data.find(item => item.operador === 'Sin Operador');
    return sinOperadorEntry ? sinOperadorEntry.total : 0;
  }, [reportData]);

  // Memoize filtered data based on the active tab
  const filteredOperators = useMemo(() => {
    let filtered = [];
    switch (activeTab) {
      case 'general':
        filtered = baseData.filter(item => item.subEquipo !== 'NO_ENCONTRADO');
        break;
      case 'otros':
        filtered = baseData.filter(item => 
          item.subEquipo === 'NO_ENCONTRADO' && 
          !isOperadorInExternos(item.operador)
        );
        break;
      case 'por-revisar':
        filtered = baseData.filter(item => 
          item.subEquipo === 'NO_ENCONTRADO' && 
          isOperadorInExternos(item.operador)
        );
        break;
      default:
        filtered = baseData;
    }

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(item => 
        item.operador.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply sub equipo filter
    if (subEquipoFilter && subEquipoFilter !== 'all') {
      filtered = filtered.filter(item => 
        item.subEquipo === subEquipoFilter
      );
    }

    return filtered;
  }, [baseData, activeTab, isOperadorInExternos, searchTerm, subEquipoFilter]);

  // Memoize totals for the filtered data
  const totals = useMemo(() => {
    const initialTotals: { [key: string]: number; total: number } = { total: 0 };

    const periodTotals = reportData?.years.reduce((acc, period) => {
      acc[period] = filteredOperators.reduce((sum, item) => sum + (item.years[period] || 0), 0);
      return acc;
    }, initialTotals) || initialTotals;

    periodTotals.total = filteredOperators.reduce((sum, item) => sum + item.total, 0);
    return periodTotals;
  }, [filteredOperators, reportData?.years]);

  // Determine which period columns to show based on totals
  const visiblePeriods = useMemo(() => {
    return reportData?.years.filter(period => totals[period] > 0) || [];
  }, [reportData?.years, totals]);

  // Get unique sub equipos for filter
  const uniqueSubEquipos = useMemo(() => {
    const subEquipos = [...new Set(baseData.map(item => item.subEquipo).filter(Boolean))];
    return subEquipos.filter(se => se !== 'NO_ENCONTRADO').sort();
  }, [baseData]);

  const tabs: { id: TabType; name: string; count: number; description: string }[] = [
    { 
      id: 'general' as TabType, 
      name: 'General', 
      count: baseData.filter(item => item.subEquipo !== 'NO_ENCONTRADO').length, 
      description: 'Operadores del proceso actual con sub-equipo asignado.' 
    },
    { 
      id: 'otros' as TabType, 
      name: 'Otros', 
      count: baseData.filter(item => item.subEquipo === 'NO_ENCONTRADO' && !isOperadorInExternos(item.operador)).length, 
      description: 'Operadores no identificados en ninguna de las listas de procesos.' 
    },
    { 
      id: 'por-revisar' as TabType, 
      name: 'Por Revisar', 
      count: baseData.filter(item => item.subEquipo === 'NO_ENCONTRADO' && isOperadorInExternos(item.operador)).length, 
      description: 'Operadores del proceso actual que se encontraron en la lista del proceso contrario (CCM/PRR).'
    },
  ]

  // ---------------------------------------------
  // GUARDIAS DE RENDERIZADO – deben colocarse DESPUÉS
  // de todos los hooks para mantener el orden de
  // invocación constante entre renders.
  // ---------------------------------------------
  if (loading) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="h-6 bg-gray-200 rounded w-full"></div>
          <div className="h-6 bg-gray-200 rounded w-5/6"></div>
          <div className="h-6 bg-gray-200 rounded w-3/4"></div>
        </div>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="text-center text-red-600">
          <h3 className="text-lg font-semibold mb-2">Error al Cargar el Reporte</h3>
          <p>{error}</p>
        </div>
      </Card>
    )
  }

  if (!reportData || reportData.data.length === 0) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="text-center text-gray-500">
          <h3 className="text-lg font-semibold mb-2">No Hay Datos Disponibles</h3>
          <p>No se encontraron datos de pendientes para este proceso.</p>
        </div>
      </Card>
    )
  }
  // ---------------------------------------------

  const exportToCSV = () => {
    const headers = ['OPERADOR', 'SUB EQUIPO', ...visiblePeriods, 'TOTAL'];
    const csvData = [
      headers.join(','),
      ...filteredOperators.map(item => [
        `"${item.operador}"`,
        `"${item.subEquipo === 'NO_ENCONTRADO' ? 'N/A' : item.subEquipo}"`,
        ...visiblePeriods.map(period => item.years[period] || 0),
        item.total
      ].join(','))
    ];
    
    const blob = new Blob([csvData.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pendientes-${activeTab}-${groupBy}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const renderSubEquipoBadge = (subEquipo: string) => {
    const displayText = subEquipo === 'NO_ENCONTRADO' ? 'N/A' : subEquipo;
    const config: { [key: string]: { bgColor: string; textColor: string; borderColor: string; dotColor: string; } } = {
      'EVALUACION': { bgColor: 'bg-blue-50', textColor: 'text-blue-800', borderColor: 'border-blue-200', dotColor: 'bg-blue-500' },
      'REASIGNADOS': { bgColor: 'bg-orange-50', textColor: 'text-orange-800', borderColor: 'border-orange-200', dotColor: 'bg-orange-500' },
      'SUSPENDIDA': { bgColor: 'bg-red-50', textColor: 'text-red-800', borderColor: 'border-red-200', dotColor: 'bg-red-500' },
      'RESPONSABLE': { bgColor: 'bg-green-50', textColor: 'text-green-800', borderColor: 'border-green-200', dotColor: 'bg-green-500' },
    };
    const style = config[subEquipo] || { bgColor: 'bg-gray-50', textColor: 'text-gray-800', borderColor: 'border-gray-200', dotColor: 'bg-gray-500' };

    return (
      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium shadow-sm ${style.bgColor} ${style.textColor} border ${style.borderColor}`}>
        <div className={`w-2 h-2 rounded-full mr-1.5 ${style.dotColor}`}></div>
        {displayText}
      </span>
    );
  };

  const { data, grandTotal, process } = reportData;

  return (
    <div className={`bg-gray-50 p-4 sm:p-6 rounded-lg ${className}`}>
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6">
        <div className="flex items-center mb-4 lg:mb-0">
          <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-200 mr-4">
            <FileStack className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-800">Reporte Avanzado de Pendientes</h3>
            <p className="text-sm text-gray-500">Análisis detallado de expedientes por operador y período.</p>
          </div>
        </div>
        <div className="flex items-center space-x-2 bg-white p-1.5 rounded-lg shadow-sm border border-gray-200">
          {['Anual', 'Trimestral', 'Mensual'].map((period) => {
            const periodKey = period.toLowerCase().startsWith('anual') ? 'year' : period.toLowerCase().startsWith('trimestral') ? 'quarter' : 'month'
            return (
              <button
                key={periodKey}
                onClick={() => onGroupingChange(periodKey as 'quarter' | 'month' | 'year')}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  groupBy === periodKey
                    ? 'bg-blue-500 text-white shadow-lg'
                    : 'text-gray-600 hover:bg-blue-50'
                }`}
              >
                {period}
              </button>
            )
          })}
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
                    ? 'border-blue-500 text-blue-600'
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
      <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex items-center">
          <div className="bg-indigo-100 p-3 rounded-full mr-4">
            <Users className="h-6 w-6 text-indigo-600" />
          </div>
          <div>
            <span className="text-sm text-gray-500 block">Total Operadores</span>
            <span className="text-2xl font-bold text-gray-900">{filteredOperators.length}</span>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex items-center">
          <div className="bg-green-100 p-3 rounded-full mr-4">
            <BarChart className="h-6 w-6 text-green-600" />
          </div>
          <div>
            <span className="text-sm text-gray-500 block">Total Pendientes</span>
            <span className="font-bold text-2xl text-gray-900">{totals.total.toLocaleString()}</span>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex items-center">
          <div className="bg-yellow-100 p-3 rounded-full mr-4">
            <AlertTriangle className="h-6 w-6 text-yellow-600" />
          </div>
          <div>
            <span className="text-sm text-gray-500 block">Sin Asignar</span>
            <span className="font-bold text-2xl text-gray-900">{sinAsignarCount.toLocaleString()}</span>
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
              className="w-full h-10 pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
          </div>
          <div className="relative w-full sm:w-64">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none z-10" />
            <select
              value={subEquipoFilter}
              onChange={(e) => setSubEquipoFilter(e.target.value)}
              className="w-full h-10 pl-10 pr-8 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-sm appearance-none"
            >
              <option value="">Todos los sub equipos</option>
              {uniqueSubEquipos.map(subEquipo => (
                <option key={subEquipo} value={subEquipo}>
                  {subEquipo}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={exportToCSV}
            className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <Download className="w-4 h-4 mr-2" />
            Exportar CSV
          </button>
        </div>
      </div>

      {/* Table for Desktop */}
      <div className="hidden md:block bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
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
                  <div className="flex items-center justify-center">
                    <FileStack className="h-4 w-4 mr-1.5 text-gray-400" />
                    <span>Sub Equipo</span>
                  </div>
                </th>
                {visiblePeriods.map(period => (
                  <th key={period} className="w-24 px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <div className="flex items-center justify-center">
                      <Calendar className="h-3.5 w-3.5 mr-1.5 text-gray-400" />
                      <span>{period}</span>
                    </div>
                  </th>
                ))}
                <th className="w-28 px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <div className="flex items-center justify-center">
                    <BarChart className="h-4 w-4 mr-1.5 text-gray-400" />
                    <span>Total</span>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredOperators.length === 0 ? (
                <tr>
                  <td colSpan={visiblePeriods.length + 3} className="px-4 py-8 text-center text-gray-500">
                    No hay datos de pendientes disponibles para esta vista.
                  </td>
                </tr>
              ) : (
                filteredOperators.map((operadorData, index) => (
                  <tr 
                    key={operadorData.operador}
                    className={`group transition-colors ${operadorData.colorClass || ''} hover:bg-gray-100`}
                  >
                    <td className={`sticky left-0 z-10 px-3 py-2 text-sm font-medium text-gray-900 border-r border-gray-200 transition-colors ${operadorData.colorClass || 'bg-white'} group-hover:bg-gray-100`}>
                      <div className="max-w-[200px] whitespace-normal leading-tight text-sm" title={operadorData.operador}>
                        {operadorData.operador}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-center">
                      {renderSubEquipoBadge(operadorData.subEquipo || 'NO_ENCONTRADO')}
                    </td>
                    {visiblePeriods.map(period => {
                      const count = operadorData.years[period] || 0;
                      return (
                        <td key={period} className={`px-4 py-2 text-sm text-center font-mono ${
                          count > 0 ? 'text-gray-900 font-medium' : 'text-gray-400'
                        }`}>
                          {count > 0 ? count.toLocaleString() : '0'}
                        </td>
                      );
                    })}
                    <td className="px-4 py-2 text-sm text-center font-bold">
                      <span className="px-2.5 py-1.5 bg-gray-100 text-gray-900 rounded-lg inline-block min-w-[50px] font-semibold">
                        {operadorData.total.toLocaleString()}
                      </span>
                    </td>
                  </tr>
                ))
              )}
              
              {/* Fila de totales */}
              <tr className="bg-gray-100 border-t-2 border-gray-300">
                <td className="sticky left-0 z-10 px-4 py-3 text-sm font-bold text-gray-900 bg-gray-100 border-r border-gray-200">
                  <div className="flex items-center">
                    <BarChart className="h-4 w-4 mr-1.5 text-gray-700" />
                    TOTAL
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-center font-bold text-gray-800">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-gray-200 text-gray-900">-</span>
                </td>
                {visiblePeriods.map(period => (
                  <td key={period} className="px-4 py-3 text-sm text-center font-bold text-gray-900">
                    {totals[period]?.toLocaleString() || '0'}
                  </td>
                ))}
                <td className="px-4 py-3 text-sm text-center font-bold text-gray-900">
                  <span className="px-3 py-1.5 bg-white bg-opacity-50 rounded-lg inline-block min-w-[60px] shadow-sm">
                    {totals.total.toLocaleString()}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Cards for Mobile */}
      <div className="block md:hidden space-y-4">
        {filteredOperators.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No hay datos de pendientes disponibles para esta vista.
          </div>
        ) : (
          <>
            {filteredOperators.map((operadorData) => (
              groupBy === 'year' ? (
                // Vista de tarjeta simple para "Anual"
                <div key={operadorData.operador} className="bg-white rounded-lg shadow-md border border-gray-200 p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div className="max-w-[80%]">
                      <h4 className="font-bold text-gray-900 leading-tight">{operadorData.operador}</h4>
                      {renderSubEquipoBadge(operadorData.subEquipo || 'NO_ENCONTRADO')}
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-gray-500">Total</div>
                      <div className="text-lg font-bold text-blue-600">{operadorData.total.toLocaleString()}</div>
                    </div>
                  </div>
                  <div className="border-t border-gray-100 pt-3">
                    <h5 className="text-xs font-medium text-gray-500 mb-2">Desglose por período:</h5>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      {visiblePeriods.slice(-6).map(period => {
                        const count = operadorData.years[period] || 0;
                        return (
                          <div key={period} className="bg-gray-50 p-2 rounded-md">
                            <div className="text-xs text-gray-500">{period}</div>
                            <div className={`font-bold ${count > 0 ? 'text-gray-800' : 'text-gray-400'}`}>{count.toLocaleString()}</div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                // Vista de acordeón para otras agrupaciones
                <details key={operadorData.operador} className="bg-white rounded-lg shadow-md border border-gray-200 open:ring-2 open:ring-blue-500 open:shadow-lg transition-all">
                  <summary className="p-4 cursor-pointer list-none flex justify-between items-center">
                    <div className="max-w-[80%]">
                      <h4 className="font-bold text-gray-900 leading-tight">{operadorData.operador}</h4>
                      {renderSubEquipoBadge(operadorData.subEquipo || 'NO_ENCONTRADO')}
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-gray-500">Total</div>
                      <div className="text-lg font-bold text-blue-600">{operadorData.total.toLocaleString()}</div>
                    </div>
                  </summary>
                  <div className="border-t border-gray-200 px-4 pt-3 pb-4">
                    <h5 className="text-xs font-medium text-gray-500 mb-2">Desglose completo por período:</h5>
                    <div className="space-y-2">
                      {visiblePeriods.map(period => {
                        const count = operadorData.years[period] || 0;
                        return (
                          <div key={period} className="flex justify-between items-center bg-gray-50 p-2 rounded-md text-sm">
                            <span className="text-gray-600">{period}</span>
                            <span className={`font-bold ${count > 0 ? 'text-gray-800' : 'text-gray-400'}`}>{count.toLocaleString()}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </details>
              )
            ))}
            {/* Total Card */}
            {filteredOperators.length > 0 && (
              groupBy === 'year' ? (
                // Vista de total simple para "Anual"
                <div className="bg-gray-100 rounded-lg shadow-md border border-gray-300 p-4 mt-4 sticky bottom-4">
                  <div className="flex justify-between items-center mb-2">
                    <div>
                      <h4 className="text-sm font-bold text-gray-800">TOTAL FILTRADO</h4>
                      <p className="text-xs text-gray-600">{filteredOperators.length} operadores</p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-blue-700">{totals.total.toLocaleString()}</div>
                    </div>
                  </div>
                  <div className="border-t border-gray-200 pt-2 grid grid-cols-3 sm:grid-cols-4 gap-2 text-center">
                      {visiblePeriods.slice(-6).map(period => (
                          <div key={period} className="bg-white/50 p-1 rounded-md">
                            <div className="text-[10px] text-gray-500">{period}</div>
                            <div className="font-bold text-sm text-gray-800">{totals[period]?.toLocaleString() || '0'}</div>
                          </div>
                      ))}
                  </div>
                </div>
              ) : (
                // Vista de total en acordeón para otras agrupaciones
                <details className="bg-gray-100 rounded-lg shadow-md border border-gray-300 open:ring-2 open:ring-blue-500 open:shadow-lg transition-all mt-4 sticky bottom-4">
                  <summary className="p-4 cursor-pointer list-none flex justify-between items-center">
                    <div>
                      <h4 className="text-sm font-bold text-gray-800">TOTAL FILTRADO</h4>
                      <p className="text-xs text-gray-600">{filteredOperators.length} operadores</p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-blue-700">{totals.total.toLocaleString()}</div>
                    </div>
                  </summary>
                  <div className="border-t border-gray-300 px-4 pt-3 pb-4">
                      <h5 className="text-xs font-medium text-gray-500 mb-2">Desglose completo de totales:</h5>
                      <div className="space-y-2">
                        {visiblePeriods.map(period => (
                            <div key={period} className="flex justify-between items-center bg-white/50 p-2 rounded-md text-sm">
                              <span className="text-gray-600">{period}</span>
                              <span className="font-bold text-gray-800">{totals[period]?.toLocaleString() || '0'}</span>
                            </div>
                        ))}
                      </div>
                    </div>
                </details>
              )
            )}
          </>
        )}
      </div>

      {/* Results info */}
      <div className="mt-4 text-sm text-gray-600">
        Mostrando {filteredOperators.length} operadores de {baseData.length} total
      </div>

      {/* Color Legend */}
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
    </div>
  )
}