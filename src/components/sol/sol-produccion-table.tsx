'use client'

import React, { useState, useMemo, useRef, useEffect } from 'react'
import ExcelJS from 'exceljs'
import { Users, BarChart, FileStack, Search, Download, Calendar, Construction } from 'lucide-react'
import { format, parseISO, subDays } from 'date-fns'
import { FilterSelect } from '@/components/ui/filter-select'
import { SolEvaluadorProduccionModal } from './sol-evaluador-produccion-modal'

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
  groupBy?: 'fechas' | 'meses';
  onGroupingChange: (groupBy: 'fechas' | 'meses') => void;
}

// Helper para verificar si un evaluador está inactivo (0 expedientes en los últimos 40 días)
function isEvaluadorInactivo(evaluador: ProduccionItem, fechasDisponibles: string[]): boolean {
  const hoy = new Date();
  const fecha40DiasAtras = subDays(hoy, 40);
  
  // Filtrar fechas de los últimos 40 días
  const fechasRecientes = fechasDisponibles.filter(fecha => {
    const fechaDate = parseISO(fecha);
    return fechaDate >= fecha40DiasAtras && fechaDate <= hoy;
  });
  
  // Verificar si tiene expedientes en alguna fecha reciente
  const tieneExpedientesRecientes = fechasRecientes.some(fecha => {
    return (evaluador.expedientesPorFecha[fecha] || 0) > 0;
  });
  
  return !tieneExpedientesRecientes;
}

export function SolProduccionTable({
  data,
  periodos,
  loading = false,
  className = '',
  groupBy: groupByProp,
  onGroupingChange
}: ProduccionTableProps) {
  const [groupBy, setGroupBy] = useState<'fechas' | 'meses'>(groupByProp || 'fechas')
  const [searchTerm, setSearchTerm] = useState('')
  const [diasMostrar, setDiasMostrar] = useState(30)
  const [selectedEvaluador, setSelectedEvaluador] = useState<ProduccionItem | null>(null)
  const tableContainerRef = useRef<HTMLDivElement>(null)

  // Scroll horizontal al fondo al montar o al cambiar de agrupación
  useEffect(() => {
    if (tableContainerRef.current) {
      const el = tableContainerRef.current;
      el.scrollLeft = el.scrollWidth;
    }
  }, [groupBy, periodos.fechas, periodos.meses, diasMostrar])

  // Mapeo de datos según agrupación
  const dataMapKey = useMemo(() => {
    return groupBy === 'fechas' ? 'expedientesPorFecha' : 'expedientesPorMes'
  }, [groupBy])

  // Períodos visibles según agrupación
  const visiblePeriods = useMemo(() => {
    let periods = groupBy === 'fechas' ? periodos.fechas : periodos.meses
    // Para fechas, mostrar según la cantidad de días seleccionada
    if (groupBy === 'fechas') {
      return periods.slice(-diasMostrar)
    }
    // Filtrar meses < 2025
    if (groupBy === 'meses') {
      periods = periods.filter(mes => parseInt(mes.split('-')[0], 10) >= 2025)
    }
    return periods
  }, [groupBy, periodos, diasMostrar])

  // Filtrar y ordenar datos
  const filteredAndSortedData = useMemo(() => {
    let filtered = data;
    
    // Aplicar filtro de búsqueda
    if (searchTerm) {
      filtered = filtered.filter(item => 
        item.evaluador.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Separar activos e inactivos
    const activos: ProduccionItem[] = [];
    const inactivos: ProduccionItem[] = [];
    
    filtered.forEach(item => {
      if (isEvaluadorInactivo(item, periodos.fechas)) {
        inactivos.push(item);
      } else {
        activos.push(item);
      }
    });
    
    // Ordenar por total general (descendente)
    activos.sort((a, b) => b.totalGeneral - a.totalGeneral);
    inactivos.sort((a, b) => b.totalGeneral - a.totalGeneral);
    
    // Concatenar: activos primero, inactivos al final
    return [...activos, ...inactivos];
  }, [data, searchTerm, periodos.fechas])

  // Calcular totales por período y total por fila según el periodo visible
  const totals = useMemo(() => {
    const periodTotals: { [key: string]: number } = {}
    let grandTotal = 0

    visiblePeriods.forEach(period => {
      periodTotals[period] = filteredAndSortedData.reduce((sum, item) => {
        return sum + (item[dataMapKey]?.[period] || 0);
      }, 0)
    })

    grandTotal = filteredAndSortedData.reduce((sum, item) => sum + (groupBy === 'fechas'
      ? visiblePeriods.reduce((acc, period) => acc + (item[dataMapKey]?.[period] || 0), 0)
      : item.totalGeneral), 0)

    return { ...periodTotals, grandTotal } as { [key: string]: number; grandTotal: number }
  }, [filteredAndSortedData, visiblePeriods, dataMapKey, groupBy])

  const exportToExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(`SOL Producción - ${groupBy}`);

    const headers = [
      { header: 'Evaluador', key: 'evaluador', width: 30 },
      ...visiblePeriods.map(p => ({ header: p, key: p, width: 15 })),
      { header: 'Total', key: 'total', width: 15 }
    ];
    worksheet.columns = headers;
    worksheet.getRow(1).font = { bold: true };

    filteredAndSortedData.forEach(item => {
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
    a.download = `sol-produccion-${groupBy}.xlsx`;
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
        No se encontraron datos de producción SOL.
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
            <h3 className="text-xl font-bold text-gray-800">Producción de Expedientes (SOL)</h3>
            <p className="text-sm text-gray-500">Todos los expedientes procesados por evaluador y fecha de trabajo.</p>
          </div>
        </div>
        {/* Selector de agrupación solo Fecha y Mes */}
        <div className="flex items-center space-x-1 bg-white p-1.5 rounded-lg shadow-sm border border-gray-200">
          {([
            { label: 'Fecha', key: 'fechas' },
            { label: 'Mes', key: 'meses' },
          ] as const).map(({ label, key }) => (
            <button
              key={key}
              onClick={() => {
                setGroupBy(key);
                onGroupingChange(key);
              }}
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
            <span className="text-2xl font-bold text-gray-900">{filteredAndSortedData.length}</span>
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
        <div className="flex flex-col sm:flex-row gap-4 items-center">
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
          {groupBy === 'fechas' && (
            <FilterSelect
              value={diasMostrar}
              onChange={e => setDiasMostrar(Number(e.target.value))}
              icon={<Calendar className="h-4 w-4" />}
              containerClassName="w-full sm:w-40"
            >
              <option value={15}>15 días</option>
              <option value={30}>30 días</option>
              <option value={60}>60 días</option>
              <option value={90}>90 días</option>
            </FilterSelect>
          )}
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
        <div className="overflow-x-auto" ref={tableContainerRef}>
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
              {filteredAndSortedData.map((item) => {
                const esInactivo = isEvaluadorInactivo(item, periodos.fechas);
                // Calcular total visible solo para fechas
                const totalVisible = groupBy === 'fechas'
                  ? visiblePeriods.reduce((acc, period) => acc + (item[dataMapKey]?.[period] || 0), 0)
                  : item.totalGeneral;
                return (
                  <tr key={item.evaluador} className="hover:bg-slate-50 transition-colors">
                    <td 
                      className="sticky left-0 bg-white group-hover:bg-slate-50 w-64 px-4 py-3 text-sm font-medium text-slate-800 border-r border-slate-200 cursor-pointer"
                      onClick={() => setSelectedEvaluador(item)}
                    >
                      <div className="flex items-center gap-2">
                        <span className="hover:text-green-600 transition-colors">{item.evaluador}</span>
                        {esInactivo && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-red-100 text-red-700 border border-red-200" style={{ lineHeight: '1.1' }}>
                            INACTIVO
                          </span>
                        )}
                      </div>
                    </td>
                    {visiblePeriods.map(period => {
                      const valor = item[dataMapKey]?.[period] || 0;
                      return (
                        <td key={period} className="w-28 px-4 py-3 text-center text-sm font-mono text-slate-600">
                          {valor}
                        </td>
                      );
                    })}
                    <td className="w-32 px-4 py-3 text-center text-sm font-bold text-slate-800 bg-slate-100 border-l border-slate-200">
                      {totalVisible}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-slate-100">
              <tr className="border-t-2 border-slate-200">
                <th className="sticky left-0 z-10 bg-slate-100 px-4 py-3 text-left text-sm font-bold text-slate-800 border-r border-slate-200">
                  TOTAL
                </th>
                {visiblePeriods.map(period => (
                  <th key={period} className="w-28 px-4 py-3 text-center text-sm font-bold text-slate-800">
                    {totals[period] || 0}
                  </th>
                ))}
                <th className="w-32 px-4 py-3 text-center text-sm font-bold text-slate-800 bg-slate-200 border-l border-slate-200">
                  {totals.grandTotal}
                </th>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Modal de evolución de producción */}
      {selectedEvaluador && (
        <SolEvaluadorProduccionModal
          evaluador={selectedEvaluador}
          fechasVisibles={visiblePeriods}
          onClose={() => setSelectedEvaluador(null)}
        />
      )}
    </div>
  )
} 