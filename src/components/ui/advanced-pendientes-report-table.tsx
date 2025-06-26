'use client'

import React, { useState, useMemo, useCallback } from 'react'
import { AdvancedDataTable, Column } from './advanced-data-table'
import { PendientesReportSummary, Evaluador, PendientesReportData } from '@/types/dashboard'
import { BarChart, Calendar, Clock, Tag, Users, FileStack, CheckCircle, AlertTriangle, Search } from 'lucide-react'

interface AdvancedPendientesReportTableProps {
  reportData: PendientesReportSummary
  otherProcessEvaluadores?: Evaluador[]
  loading?: boolean
  className?: string
}

type TabType = 'general' | 'otros' | 'por-revisar'

export function AdvancedPendientesReportTable({ 
  reportData, 
  otherProcessEvaluadores = [],
  loading = false, 
  className = '',
  groupBy,
  onGroupingChange
}: AdvancedPendientesReportTableProps & { 
  groupBy: 'quarter' | 'month' | 'year'; 
  onGroupingChange: (newGroupBy: 'quarter' | 'month' | 'year') => void; 
}) {
  const [activeTab, setActiveTab] = useState<TabType>('general')

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
  const baseData = useMemo(() => reportData.data.filter(item => item.operador !== 'Sin Operador'), [reportData.data]);

  // Data for 'Sin Asignar' card, counting only 2024 and 2025
  const sinAsignarCount = useMemo(() => {
    const sinOperadorEntry = reportData.data.find(item => item.operador === 'Sin Operador');
    return sinOperadorEntry ? sinOperadorEntry.total : 0;
  }, [reportData.data]);

  // Memoize filtered data based on the active tab
  const filteredOperators = useMemo(() => {
    switch (activeTab) {
      case 'general':
        return baseData.filter(item => item.subEquipo !== 'NO_ENCONTRADO');
      case 'otros':
        return baseData.filter(item => 
          item.subEquipo === 'NO_ENCONTRADO' && 
          !isOperadorInExternos(item.operador)
        );
      case 'por-revisar':
        return baseData.filter(item => 
          item.subEquipo === 'NO_ENCONTRADO' && 
          isOperadorInExternos(item.operador)
        );
      default:
        return baseData;
    }
  }, [baseData, activeTab, isOperadorInExternos]);

  // Memoize grand total for the filtered data
  const totals = useMemo(() => {
    const initialTotals: { [key: string]: number; total: number } = { total: 0 };

    const periodTotals = reportData.years.reduce((acc, period) => {
      acc[period] = filteredOperators.reduce((sum, item) => sum + (item.years[period] || 0), 0);
      return acc;
    }, initialTotals);

    periodTotals.total = filteredOperators.reduce((sum, item) => sum + item.total, 0);

    return periodTotals;
  }, [filteredOperators, reportData.years]);

  // Determine which period columns to show based on totals
  const visiblePeriods = useMemo(() => {
    return reportData.years.filter(period => totals[period] > 0);
  }, [reportData.years, totals]);

  // Define table columns dynamically
  const columns: Column<PendientesReportData>[] = useMemo(() => {
    const baseColumns: Column<PendientesReportData>[] = [
    {
      key: 'operador',
      title: 'OPERADOR',
      accessor: (item) => item.operador,
      sortable: true,
      filterable: true,
      className: 'sticky left-0 z-10 w-40 bg-inherit text-left',
      render: (value) => (
        <div className="font-medium text-gray-900 whitespace-nowrap">
          {value}
        </div>
      ),
    },
    {
      key: 'subEquipo',
      title: 'Sub Equipo',
      accessor: (item) => item.subEquipo,
      sortable: true,
      filterable: true,
      className: 'w-36 text-center',
      headerClassName: 'text-center',
      render: (value, item) => {
        const subEquipo = item.subEquipo === 'NO_ENCONTRADO' ? 'N/A' : item.subEquipo;
        const config: { [key: string]: { bgColor: string; textColor: string; borderColor: string; dotColor: string; } } = {
          'EVALUACION': { bgColor: 'bg-blue-50', textColor: 'text-blue-800', borderColor: 'border-blue-200', dotColor: 'bg-blue-500' },
          'REASIGNADOS': { bgColor: 'bg-orange-50', textColor: 'text-orange-800', borderColor: 'border-orange-200', dotColor: 'bg-orange-500' },
          'SUSPENDIDA': { bgColor: 'bg-red-50', textColor: 'text-red-800', borderColor: 'border-red-200', dotColor: 'bg-red-500' },
          'RESPONSABLE': { bgColor: 'bg-green-50', textColor: 'text-green-800', borderColor: 'border-green-200', dotColor: 'bg-green-500' },
        };
        const style = config[value as string] || { bgColor: 'bg-gray-50', textColor: 'text-gray-800', borderColor: 'border-gray-200', dotColor: 'bg-gray-500' };

        return (
          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium shadow-sm ${style.bgColor} ${style.textColor} border ${style.borderColor}`}>
            <div className={`w-2 h-2 rounded-full mr-1.5 ${style.dotColor}`}></div>
            {subEquipo}
          </span>
        );
      },
    },
    ];

    const periodColumns: Column<PendientesReportData>[] = visiblePeriods.map(period => ({
      key: `period-${period}`,
      title: period,
      accessor: (item: PendientesReportData) => item.years[period] || 0,
      sortable: true,
      className: 'w-24 text-center',
      headerClassName: 'text-center',
      render: (value: number) => (
        <span className={`${value > 0 ? 'font-semibold text-gray-800' : 'text-gray-400'}`}>
          {value}
        </span>
      ),
    }));

    const totalColumn: Column<PendientesReportData> = {
      key: 'total',
      title: 'TOTAL',
      accessor: (item) => item.total,
      sortable: true,
      className: 'w-24 font-bold text-center',
      headerClassName: 'text-center',
      render: (value) => (
        <span className="font-bold text-gray-900">
          {value.toLocaleString()}
        </span>
      ),
    };

    return [...baseColumns, ...periodColumns, totalColumn];
  }, [visiblePeriods]);

  // Define row class names for styling
  const getRowClassName = (item: PendientesReportData) => {
    return item.colorClass || ''
  }

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

  return (
    <div className={`bg-gray-50 p-4 sm:p-6 rounded-lg ${className}`}>
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

      {/* Advanced Table with horizontal scroll */}
      <div className="overflow-x-auto w-full bg-white rounded-lg shadow-md border border-gray-200">
        <AdvancedDataTable
          data={filteredOperators} // Use filtered data
          columns={columns}
          loading={loading}
          searchable={true}
          exportable={true}
          selectable={false}
          pageSize={filteredOperators.length} // Show all data
          className="min-w-full"
          emptyMessage="No hay datos de pendientes disponibles para esta vista."
          getRowClassName={getRowClassName}
          footer={
            <tr className="bg-gray-200 font-bold text-gray-800 text-sm border-t-2 border-gray-300">
              <td className="sticky left-0 bg-gray-200 z-10 px-4 py-4 text-left">TOTALES</td>
              <td className="px-4 py-4 text-center">-</td>
              {visiblePeriods.map(period => (
                <td key={`total-${period}`} className="px-4 py-4 text-center">
                  {totals[period].toLocaleString()}
                </td>
              ))}
              <td className="px-4 py-4 text-center">{totals.total.toLocaleString()}</td>
            </tr>
          }
        />
      </div>

      {/* Color Legend */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h4 className="text-sm font-medium text-gray-900 mb-3">Código de Colores por Sub Equipo:</h4>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {reportData.legend.map(legend => (
            <div key={legend.subEquipo} className="flex items-center space-x-2">
              <div className={`w-4 h-4 rounded ${legend.colorClass}`}></div>
              <p className="text-xs text-gray-500">{legend.subEquipo} {legend.count}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}