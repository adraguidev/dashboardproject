'use client'

import React, { useState, useMemo, useCallback } from 'react'
import { AdvancedDataTable, Column } from './advanced-data-table'
import { PendientesReportSummary, Evaluador, PendientesReportData } from '@/types/dashboard'

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
      className: 'sticky left-0 bg-white z-10 w-48',
      render: (value) => (
        <div className="font-medium text-gray-900 whitespace-nowrap pl-4">
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
      className: 'w-24',
      render: (value, item) => (
        <div className="flex items-center">
          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${item.colorClass}`}>
            {value.substring(0, 4)}
          </span>
        </div>
      ),
    },
    ];

    const periodColumns: Column<PendientesReportData>[] = visiblePeriods.map(period => ({
      key: `period-${period}`,
      title: period,
      accessor: (item: PendientesReportData) => item.years[period] || 0,
      sortable: true,
      className: 'min-w-[6rem] text-center',
      render: (value: number) => (
        <div className={`text-center ${value > 0 ? 'font-semibold text-gray-800' : 'text-gray-400'}`}>
          {value}
        </div>
      ),
    }));

    const totalColumn: Column<PendientesReportData> = {
      key: 'total',
      title: 'TOTAL',
      accessor: (item) => item.total,
      sortable: true,
      className: 'min-w-[6rem] font-bold text-right pr-4',
      render: (value) => (
        <div className="font-bold text-right text-gray-900 pr-4">
          {value}
        </div>
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
    <div className={`bg-white p-6 rounded-lg shadow-md ${className}`}>
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Reporte de Pendientes</h3>
          <p className="text-sm text-gray-500">Análisis detallado de expedientes por operador y período.</p>
        </div>
        <div className="flex items-center space-x-2 bg-gray-100 p-1 rounded-lg">
          {['Anual', 'Trimestral', 'Mensual'].map((period) => {
            const periodKey = period.toLowerCase().startsWith('anual') ? 'year' : period.toLowerCase().startsWith('trimestral') ? 'quarter' : 'month'
            return (
              <button
                key={periodKey}
                onClick={() => onGroupingChange(periodKey as 'quarter' | 'month' | 'year')}
                className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                  groupBy === periodKey
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:bg-gray-200'
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
      <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="text-sm font-medium text-blue-900">Total Operadores</div>
          <div className="text-2xl font-bold text-blue-600">
            {filteredOperators.length}
          </div>
        </div>
        <div className="bg-green-50 p-4 rounded-lg">
          <div className="text-sm font-medium text-green-900">Total Pendientes</div>
          <div className="text-2xl font-bold text-green-600">
            {totals.total.toLocaleString()}
          </div>
        </div>
        <div className="bg-yellow-50 p-4 rounded-lg">
          <div className="text-sm font-medium text-yellow-900">Sin Asignar</div>
          <div className="text-2xl font-bold text-yellow-600">
            {sinAsignarCount.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Advanced Table with horizontal scroll */}
      <div className="overflow-x-auto w-full">
        <AdvancedDataTable
          data={filteredOperators} // Use filtered data
          columns={columns}
          loading={loading}
          searchable={true}
          exportable={true}
          selectable={false}
          pageSize={filteredOperators.length} // Show all data
          className="shadow-lg min-w-full"
          emptyMessage="No hay datos de pendientes disponibles para esta vista."
          getRowClassName={getRowClassName}
          footer={
            <tr className="bg-gray-100 font-bold text-gray-900">
              <td className="sticky left-0 bg-gray-100 z-10 px-4 py-3">TOTALES</td>
              <td className="px-4 py-3"></td>
              {visiblePeriods.map(period => (
                <td key={`total-${period}`} className="px-4 py-3 text-center">
                  {totals[period]}
                </td>
              ))}
              <td className="px-4 py-3 text-right pr-4">{totals.total}</td>
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