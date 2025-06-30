'use client'

import React, { useState, useMemo } from 'react'
import * as ExcelJS from 'exceljs'
import { BarChart, Users, FileStack, Search, Download, Calendar } from 'lucide-react'
import { EvaluadorDetailModal } from './evaluador-detail-modal'

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
  groupBy: GroupBy
  onGroupingChange: (groupBy: GroupBy) => void
}

type GroupBy = 'anio' | 'trimestre' | 'mes';

export function SpePendientesTable({
  data,
  periodos,
  loading = false,
  className = '',
  groupBy,
  onGroupingChange
}: SpePendientesTableProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedEvaluador, setSelectedEvaluador] = useState<string | null>(null)

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

  const exportToExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(`SPE Pendientes - ${groupBy}`);

    const headers = [
      { header: 'Evaluador', key: 'evaluador', width: 30 },
      ...visiblePeriods.map(p => ({ header: p, key: p, width: 15 })),
      { header: 'Total', key: 'total', width: 15 }
    ];
    worksheet.columns = headers;
    worksheet.getRow(1).font = { bold: true };

    filteredData.forEach(item => {
      const rowData: any = {
        evaluador: item.evaluador,
        total: item.totalGeneral,
      };
      visiblePeriods.forEach(p => {
        rowData[p] = item[dataMapKey]?.[p] || 0;
      });
      worksheet.addRow(rowData);
    });
    
    // Total Row
    const totalRowData: any = { evaluador: 'TOTAL', total: totals.grandTotal };
    visiblePeriods.forEach(p => {
        totalRowData[p] = totals[p] || 0;
    });
    const totalRow = worksheet.addRow(totalRowData);
    totalRow.font = { bold: true };


    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `spe-pendientes-${groupBy}.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
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
    <div className={className}>
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
          {(
            [
              { label: 'Año', key: 'anio' },
              { label: 'Trimestre', key: 'trimestre' },
              { label: 'Mes', key: 'mes' },
            ] as const
          ).map(({ label, key }) => {
            return (
              <button
                key={key}
                onClick={() => onGroupingChange(key)}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  groupBy === key
                    ? 'bg-purple-600 text-white shadow-lg'
                    : 'text-gray-600 hover:bg-purple-50'
                }`}
              >
                {label}
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
          onClick={exportToExcel}
          className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-purple-500"
        >
          <Download className="w-4 h-4 mr-2" />
          Exportar Excel
        </button>
      </div>
      
      {/* Table - Aplicando nuevo estilo */}
      <div className="bg-white rounded-lg shadow-md border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 text-slate-600">
              <tr className="border-b border-slate-200">
                <th className="sticky left-0 z-10 bg-slate-50 w-64 px-4 py-3 text-left font-semibold uppercase text-xs tracking-wider border-r border-slate-200">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-slate-400" />
                    <span>Evaluador</span>
                  </div>
                </th>
                {visiblePeriods.map(periodo => (
                  <th key={periodo} className="w-28 px-4 py-3 text-center font-semibold uppercase text-xs tracking-wider">
                    <div className="flex items-center justify-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>{periodo}</span>
                    </div>
                  </th>
                ))}
                <th className="w-32 px-4 py-3 text-center font-semibold uppercase text-xs tracking-wider bg-slate-100 border-l border-slate-200">
                  Total
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-100">
              {filteredData.map((item) => (
                <tr key={item.evaluador} className="hover:bg-slate-50 transition-colors">
                  <td className="sticky left-0 bg-white group-hover:bg-slate-50 w-64 px-4 py-3 text-sm font-medium text-slate-800 border-r border-slate-200 cursor-pointer" onClick={() => setSelectedEvaluador(item.evaluador)}>
                    {item.evaluador}
                  </td>
                  {visiblePeriods.map(periodo => (
                    <td key={periodo} className="w-28 px-4 py-3 text-center text-sm font-mono text-slate-600">
                      {item[dataMapKey]?.[periodo] || 0}
                    </td>
                  ))}
                  <td className="w-32 px-4 py-3 text-center text-sm font-bold text-slate-800 bg-slate-100 border-l border-slate-200">
                    {item.totalGeneral}
                  </td>
                </tr>
              ))}
            </tbody>
             <tfoot className="bg-slate-100">
              <tr className="border-t-2 border-slate-200">
                <th className="sticky left-0 z-10 bg-slate-100 px-4 py-3 text-left text-sm font-bold text-slate-800 border-r border-slate-200">
                  TOTAL
                </th>
                {visiblePeriods.map(periodo => (
                  <th key={periodo} className="w-28 px-4 py-3 text-center text-sm font-bold font-mono text-slate-800">
                    {totals[periodo].toLocaleString()}
                  </th>
                ))}
                <th className="w-32 px-4 py-3 text-center text-sm font-bold text-slate-800 bg-slate-200 border-l border-slate-300">
                  {totals.grandTotal.toLocaleString()}
                </th>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Modal detalle */}
      <EvaluadorDetailModal evaluador={selectedEvaluador} onClose={() => setSelectedEvaluador(null)} />
    </div>
  )
} 