'use client'

import React, { useState, useMemo } from 'react'
import ExcelJS from 'exceljs'
import { Users, BarChart, FileStack, Search, Download, Calendar, Construction } from 'lucide-react'
import { format, parseISO } from 'date-fns'

interface ProduccionItem {
  evaluador: string;
  expedientesPorFecha: { [fecha: string]: number };
  expedientesPorMes: { [mes: string]: number };
  expedientesPorAnio: { [anio: string]: number };
  totalGeneral: number;
}

interface ProduccionTableProps {
  data: ProduccionItem[];
  periodos: {
    fechas: string[];
    meses: string[];
    anios: string[];
  };
  loading?: boolean;
  className?: string;
  groupBy: 'fechas' | 'meses' | 'anios';
  onGroupingChange: (groupBy: 'fechas' | 'meses' | 'anios') => void;
}

// Utilidades para bolitas
function EtapaDot({ color, children }: { color: string, children: React.ReactNode }) {
  return <span className={`inline-flex items-center gap-1 text-xs`}><span className={`inline-block w-2 h-2 rounded-full mr-1`} style={{ background: color }}></span>{children}</span>;
}

// Helper para asegurar estructura de celda
function getCell(val: any): { total: number, finalizadas: number, iniciadas: number } {
  if (!val) return { total: 0, finalizadas: 0, iniciadas: 0 };
  if (typeof val === 'number') return { total: val, finalizadas: 0, iniciadas: 0 };
  if (typeof val === 'object' && 'total' in val && 'finalizadas' in val && 'iniciadas' in val) return val;
  return { total: 0, finalizadas: 0, iniciadas: 0 };
}

export function SpeProduccionTable({
  data,
  periodos,
  loading = false,
  className = '',
  groupBy,
  onGroupingChange
}: ProduccionTableProps) {
  const [searchTerm, setSearchTerm] = useState('')

  // Mapeo de datos según agrupación
  const dataMapKey = useMemo(() => {
    return groupBy === 'fechas' ? 'expedientesPorFecha' :
           groupBy === 'meses' ? 'expedientesPorMes' : 'expedientesPorAnio'
  }, [groupBy])

  // Períodos visibles según agrupación
  const visiblePeriods = useMemo(() => {
    let periods = groupBy === 'fechas' ? periodos.fechas :
                 groupBy === 'meses' ? periodos.meses : periodos.anios
    // Para fechas, mostrar solo las últimas 30 para no sobrecargar la tabla
    if (groupBy === 'fechas') {
      return periods.slice(-30)
    }
    // Filtrar meses y años < 2025
    if (groupBy === 'meses') {
      periods = periods.filter(mes => parseInt(mes.split('-')[0], 10) >= 2025)
    }
    if (groupBy === 'anios') {
      periods = periods.filter(anio => parseInt(anio, 10) >= 2025)
    }
    return periods
  }, [groupBy, periodos])

  // Filtrar datos por término de búsqueda
  const filteredData = useMemo(() => {
    if (!searchTerm) return data
    return data.filter(item => 
      item.evaluador.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [data, searchTerm])

  // Calcular totales por período
  const totals = useMemo(() => {
    const periodTotals: { [key: string]: number } = {}
    let grandTotal = 0

    visiblePeriods.forEach(period => {
      periodTotals[period] = filteredData.reduce((sum, item) => {
        const cell = getCell(item[dataMapKey]?.[period]);
        return sum + cell.total;
      }, 0)
    })

    grandTotal = filteredData.reduce((sum, item) => sum + item.totalGeneral, 0)

    return { ...periodTotals, grandTotal } as { [key: string]: number; grandTotal: number }
  }, [filteredData, visiblePeriods, dataMapKey])

  const exportToExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(`SPE Producción - ${groupBy}`);

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
    
    // Fila de totales
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
    a.download = `spe-produccion-${groupBy}.xlsx`;
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
        No se encontraron datos de producción SPE.
      </div>
    )
  }

  return (
    <div className={className}>
      {/* Header visual */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6">
        <div className="flex items-center mb-4 lg:mb-0">
          <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-200 mr-4">
            <Construction className="h-6 w-6 text-green-600" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-800">Producción de Expedientes (SPE)</h3>
            <p className="text-sm text-gray-500">Todos los expedientes procesados por evaluador y fecha de trabajo.</p>
          </div>
        </div>
        {/* Selector de agrupación */}
        <div className="flex items-center space-x-1 bg-white p-1.5 rounded-lg shadow-sm border border-gray-200">
          {([
            { label: 'Fecha', key: 'fechas' },
            { label: 'Mes', key: 'meses' },
            { label: 'Año', key: 'anios' },
          ] as const).map(({ label, key }) => (
            <button
              key={key}
              onClick={() => onGroupingChange(key)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                groupBy === key
                  ? 'bg-green-600 text-white shadow-lg'
                  : 'text-gray-600 hover:bg-green-50'
              }`}
            >
              {label}
            </button>
          ))}
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
            <span className="text-sm text-gray-500 block">Total Expedientes</span>
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
            className="w-full h-10 pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
          />
        </div>
        <button
          onClick={exportToExcel}
          className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          <Download className="w-4 h-4 mr-2" />
          Exportar Excel
        </button>
      </div>

      {/* Tabla visual */}
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
                {visiblePeriods.map(period => (
                  <th key={period} className="w-28 px-4 py-3 text-center font-semibold uppercase text-xs tracking-wider">
                    <div className="flex items-center justify-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>{groupBy === 'fechas' ? format(parseISO(period), 'dd/MM') : period}</span>
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
                  <td className="sticky left-0 bg-white group-hover:bg-slate-50 w-64 px-4 py-3 text-sm font-medium text-slate-800 border-r border-slate-200">
                    {item.evaluador}
                  </td>
                  {visiblePeriods.map(period => {
                    const cell = getCell(item[dataMapKey]?.[period]);
                    return (
                      <td key={period} className="w-28 px-4 py-3 text-center text-sm font-mono text-slate-600">
                        <div>{cell.total}</div>
                        <div className="flex justify-center gap-2 mt-0.5">
                          {cell.finalizadas > 0 && <EtapaDot color="#22c55e">{cell.finalizadas}</EtapaDot>}
                          {cell.iniciadas > 0 && <EtapaDot color="#eab308">{cell.iniciadas}</EtapaDot>}
                        </div>
                      </td>
                    );
                  })}
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
                {visiblePeriods.map(period => {
                  // Calcular totales de finalizadas/iniciadas para el periodo
                  let totalFinalizadas = 0;
                  let totalIniciadas = 0;
                  filteredData.forEach(item => {
                    const cell = getCell(item[dataMapKey]?.[period]);
                    totalFinalizadas += cell.finalizadas;
                    totalIniciadas += cell.iniciadas;
                  });
                  return (
                    <th key={period} className="w-28 px-4 py-3 text-center text-sm font-bold text-slate-800">
                      <div>{totals[period] || 0}</div>
                      <div className="flex justify-center gap-2 mt-0.5">
                        {totalFinalizadas > 0 && <EtapaDot color="#22c55e">{totalFinalizadas}</EtapaDot>}
                        {totalIniciadas > 0 && <EtapaDot color="#eab308">{totalIniciadas}</EtapaDot>}
                      </div>
                    </th>
                  );
                })}
                <th className="w-32 px-4 py-3 text-center text-sm font-bold text-slate-800 bg-slate-200 border-l border-slate-200">
                  {totals.grandTotal}
                </th>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  )
} 