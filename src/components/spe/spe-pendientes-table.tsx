'use client'

import React, { useState, useMemo } from 'react'
import { BarChart, Users, FileStack, Search, Download, Calendar } from 'lucide-react'

interface SpePendienteData {
  evaluador: string;
  expedientesPorAnio: { [anio: string]: number };
  expedientesPorTrimestre: { [trimestre: string]: number };
  expedientesPorMes: { [mes: string]: number };
  totalGeneral: number;
}

interface SpePendientesTableProps {
  data: SpePendienteData[]
  periodos: {
    anios: string[];
    trimestres: string[];
    meses: string[];
  }
  loading?: boolean
  className?: string
}

type GroupBy = 'anio' | 'trimestre' | 'mes';

export function SpePendientesTable({
  data,
  periodos,
  loading = false,
  className = '',
}: SpePendientesTableProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [groupBy, setGroupBy] = useState<GroupBy>('anio');

  const { visiblePeriods, dataMapKey } = useMemo(() => {
    switch (groupBy) {
      case 'mes':
        return { visiblePeriods: periodos.meses, dataMapKey: 'expedientesPorMes' as const };
      case 'trimestre':
        return { visiblePeriods: periodos.trimestres, dataMapKey: 'expedientesPorTrimestre' as const };
      default: // 'anio'
        return { visiblePeriods: periodos.anios, dataMapKey: 'expedientesPorAnio' as const };
    }
  }, [groupBy, periodos]);

  const filteredData = useMemo(() => {
    if (!data) return []
    if (!searchTerm) return data

    return data.filter(item =>
      item.evaluador.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [data, searchTerm])

  const totals = useMemo(() => {
    const periodTotals: { [key: string]: number } = {}
    visiblePeriods.forEach(period => {
      periodTotals[period] = filteredData.reduce((sum, item) => sum + (item[dataMapKey]?.[period] || 0), 0)
    })
    const grandTotal = filteredData.reduce((sum, item) => sum + item.totalGeneral, 0)
    return { ...periodTotals, grandTotal } as { [key: string]: number; grandTotal: number };
  }, [filteredData, visiblePeriods, dataMapKey])

  const exportToCSV = () => {
    const headers = ['EVALUADOR', ...visiblePeriods, 'TOTAL'];
    const csvData = [
      headers.join(','),
      ...filteredData.map(item => [
        `"${item.evaluador}"`,
        ...visiblePeriods.map(period => item[dataMapKey]?.[period] || 0),
        item.totalGeneral
      ].join(','))
    ];
    
    const blob = new Blob([csvData.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `spe-pendientes-${groupBy}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };
  
  if (loading) {
    return (
      <div className="animate-pulse space-y-4 p-6">
        <div className="h-8 bg-gray-200 rounded w-1/3"></div>
        <div className="h-10 bg-gray-200 rounded w-full"></div>
        <div className="h-64 bg-gray-200 rounded w-full"></div>
      </div>
    )
  }

  if (!data || data.length === 0) {
    return (
      <div className="p-10 text-center text-gray-500">
        No se encontraron datos de pendientes "INICIADA" en la hoja de cálculo.
      </div>
    )
  }

  return (
    <div className={`bg-gray-50 p-4 sm:p-6 rounded-lg ${className}`}>
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6">
        <div className="flex items-center mb-4 lg:mb-0">
          <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-200 mr-4">
            <FileStack className="h-6 w-6 text-purple-600" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-800">Reporte de Pendientes (SPE)</h3>
            <p className="text-sm text-gray-500">Expedientes con etapa "INICIADA", agrupados por evaluador y período.</p>
          </div>
        </div>
        
        {/* Selector de Agrupación */}
        <div className="flex items-center space-x-1 bg-white p-1.5 rounded-lg shadow-sm border border-gray-200">
          {(['Año', 'Trimestre', 'Mes'] as const).map((period) => {
            const periodKey = period.toLowerCase() as GroupBy;
            return (
              <button
                key={periodKey}
                onClick={() => setGroupBy(periodKey)}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  groupBy === periodKey
                    ? 'bg-purple-600 text-white shadow-lg'
                    : 'text-gray-600 hover:bg-purple-50'
                }`}
              >
                {period}
              </button>
            )
          })}
        </div>
      </div>
      
      {/* Stats */}
      <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex items-center">
          <div className="bg-indigo-100 p-3 rounded-full mr-4">
            <Users className="h-6 w-6 text-indigo-600" />
          </div>
          <div>
            <span className="text-sm text-gray-500 block">Total Evaluadores</span>
            <span className="text-2xl font-bold text-gray-900">{filteredData.length}</span>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex items-center">
          <div className="bg-green-100 p-3 rounded-full mr-4">
            <BarChart className="h-6 w-6 text-green-600" />
          </div>
          <div>
            <span className="text-sm text-gray-500 block">Total Pendientes</span>
            <span className="font-bold text-2xl text-gray-900">{totals.grandTotal.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="mb-4 flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Buscar evaluador..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-10 pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm"
          />
        </div>
        <button
          onClick={exportToCSV}
          className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-purple-500"
        >
          <Download className="w-4 h-4 mr-2" />
          Exportar CSV
        </button>
      </div>
      
      {/* Table */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="sticky left-0 z-10 bg-gray-50 w-64 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r">
                  Evaluador
                </th>
                {visiblePeriods.map(periodo => (
                  <th key={periodo} className="w-28 px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {periodo}
                  </th>
                ))}
                <th className="w-32 px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-100">
                  Total
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredData.map((item) => (
                <tr key={item.evaluador} className="hover:bg-purple-50">
                  <td className="sticky left-0 bg-white group-hover:bg-purple-50 w-64 px-4 py-3 text-sm font-medium text-gray-900 border-r">
                    {item.evaluador}
                  </td>
                  {visiblePeriods.map(periodo => (
                    <td key={periodo} className="w-28 px-4 py-3 text-center text-sm text-gray-700">
                      {item[dataMapKey]?.[periodo] || 0}
                    </td>
                  ))}
                  <td className="w-32 px-4 py-3 text-center text-sm font-bold text-gray-900 bg-gray-50 group-hover:bg-purple-100">
                    {item.totalGeneral}
                  </td>
                </tr>
              ))}
            </tbody>
             <tfoot className="bg-gray-100">
              <tr>
                <th className="sticky left-0 z-10 bg-gray-100 px-4 py-3 text-left text-sm font-bold text-gray-800 border-r">
                  TOTAL
                </th>
                {visiblePeriods.map(periodo => (
                  <th key={periodo} className="w-28 px-4 py-3 text-center text-sm font-bold text-gray-800">
                    {totals[periodo].toLocaleString()}
                  </th>
                ))}
                <th className="w-32 px-4 py-3 text-center text-sm font-bold text-gray-800 bg-gray-200">
                  {totals.grandTotal.toLocaleString()}
                </th>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  )
} 