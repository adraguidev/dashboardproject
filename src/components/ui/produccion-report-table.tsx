'use client'

import React, { useState, useMemo, useCallback } from 'react'
import * as ExcelJS from 'exceljs'
import { Card } from './card'
import { ProduccionReportSummary, Evaluador, ProduccionReportData } from '@/types/dashboard'
import { ProduccionChart } from './produccion-chart'
import { formatDateShort } from '@/lib/date-utils'
import { ProductionOperatorModal } from './production-operator-modal'
import { Download, Search, Filter } from 'lucide-react'

interface ProduccionReportTableProps {
  report: ProduccionReportSummary | null
  otherProcessEvaluadores?: Evaluador[]
  loading?: boolean
  error?: string | null
  className?: string
  onFiltersChange: (newFilters: { days?: number; dayType?: 'TODOS' | 'LABORABLES' | 'FIN_DE_SEMANA' }) => void
  currentFilters: { days: number, dayType: 'TODOS' | 'LABORABLES' | 'FIN_DE_SEMANA' }
}

type TabType = 'general' | 'otros' | 'por-revisar'

export function ProduccionReportTable({
  report,
  otherProcessEvaluadores = [],
  loading = false,
  error = null,
  className = '',
  onFiltersChange,
  currentFilters
}: ProduccionReportTableProps) {
  const [activeTab, setActiveTab] = useState<TabType>('general')
  const [modalOperator, setModalOperator] = useState<ProduccionReportData|null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [subEquipoFilter, setSubEquipoFilter] = useState('')

  const exportToExcel = async () => {
    if (!report || !filteredOperators) return;

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(`Produccion - ${activeTab}`);

    // Headers
    const headers = [
      { header: 'Operador', key: 'operador', width: 30 },
      { header: 'Sub Equipo', key: 'subEquipo', width: 20 },
      ...visibleFechas.map(fecha => ({ header: formatDate(fecha), key: fecha, width: 15 })),
      { header: 'Total', key: 'total', width: 15 }
    ];
    worksheet.columns = headers;
    worksheet.getRow(1).font = { bold: true };

    // Rows
    filteredOperators.forEach(operadorData => {
      const rowData: any = {
        operador: operadorData.operador,
        subEquipo: operadorData.subEquipo === 'NO_ENCONTRADO' ? 'N/A' : operadorData.subEquipo,
        total: visibleFechas.reduce((sum, fecha) => sum + (operadorData.fechas[fecha] || 0), 0)
      };
      visibleFechas.forEach(fecha => {
        rowData[fecha] = operadorData.fechas[fecha] || 0;
      });
      worksheet.addRow(rowData);
    });

    // Total Row
    const totalRowData: any = { operador: 'TOTAL', subEquipo: '-', total: filteredTotals.total };
    visibleFechas.forEach(fecha => {
      totalRowData[fecha] = (filteredTotals as any)[fecha] || 0;
    });
    const totalRow = worksheet.addRow(totalRowData);
    totalRow.font = { bold: true };
    totalRow.getCell('A').font = { bold: true };


    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `reporte_produccion_${report.process}_${activeTab}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

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

  // Base data filtering
  const baseData = useMemo(() => {
    if (!report) return [];
    return report.data.filter(item => item.operador !== 'Sin Operador');
  }, [report]);

  // Get unique sub-equipos for the filter dropdown, only for the 'general' tab
  const uniqueSubEquipos = useMemo(() => {
    const generalData = baseData.filter(item => item.subEquipo !== 'NO_ENCONTRADO');
    return [...new Set(generalData.map(item => item.subEquipo))].sort();
  }, [baseData]);

  // Memoize filtered data based on the active tab
  const filteredOperators = useMemo(() => {
    let baseFilteredData;
    switch (activeTab) {
      case 'general':
        baseFilteredData = baseData.filter(item => item.subEquipo !== 'NO_ENCONTRADO');
        break;
      case 'otros':
        baseFilteredData = baseData.filter(item => 
          item.subEquipo === 'NO_ENCONTRADO' && 
          !isOperadorInExternos(item.operador)
        );
        break;
      case 'por-revisar':
        baseFilteredData = baseData.filter(item => 
          item.subEquipo === 'NO_ENCONTRADO' && 
          isOperadorInExternos(item.operador)
        );
        break;
      default:
        baseFilteredData = baseData;
    }

    let finalFilteredData = baseFilteredData;

    // Apply search term filter
    if (searchTerm) {
      finalFilteredData = finalFilteredData.filter(item =>
        item.operador.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply sub-equipo filter (only for general tab)
    if (activeTab === 'general' && subEquipoFilter) {
      finalFilteredData = finalFilteredData.filter(item =>
        item.subEquipo === subEquipoFilter
      );
    }
    
    return finalFilteredData;
  }, [baseData, activeTab, isOperadorInExternos, searchTerm, subEquipoFilter]);

  // Memoize grand total for the filtered data (para las pestañas, usa todas las fechas)
  const totals = useMemo(() => {
    if (!report) return { total: 0 } as { [key: string]: number; total: number };
    
    const initialTotals: { [key: string]: number; total: number } = { total: 0 };

    const periodTotals = report.fechas.reduce((acc, fecha) => {
      acc[fecha] = filteredOperators.reduce((sum, item) => sum + (item.fechas[fecha] || 0), 0);
      return acc;
    }, initialTotals);

    periodTotals.total = filteredOperators.reduce((sum, item) => sum + item.total, 0);

    return periodTotals;
  }, [filteredOperators, report]);

  // Calcular totales solo para los operadores de la pestaña activa
  const filteredTotals = useMemo(() => {
    if (!report) return { total: 0 } as { [key: string]: number; total: number };
    
    const initialTotals: { [key: string]: number; total: number } = { total: 0 };

    // Calcular totales por fecha solo para operadores filtrados
    const periodTotals = report.fechas.reduce((acc, fecha) => {
      acc[fecha] = filteredOperators.reduce((sum, item) => sum + (item.fechas[fecha] || 0), 0);
      return acc;
    }, initialTotals);

    // Calcular total general para operadores filtrados
    periodTotals.total = filteredOperators.reduce((sum, item) => {
      return sum + report.fechas.reduce((dateSum, fecha) => dateSum + (item.fechas[fecha] || 0), 0);
    }, 0);

    return periodTotals;
  }, [report, filteredOperators]);

  // Crear un reporte filtrado para el gráfico
  const filteredReport = useMemo((): ProduccionReportSummary | null => {
    if (!report) return null;
    
    return {
      ...report,
      data: filteredOperators,
      totalByDate: filteredTotals as { [key: string]: number },
      grandTotal: filteredTotals.total
    };
  }, [report, filteredOperators, filteredTotals]);

  // Función para formatear fecha usando utilidad global
  const formatDate = useCallback((dateStr: string) => {
    return formatDateShort(dateStr);
  }, []);

  // Determinar qué fechas mostrar (solo las que tienen datos en la pestaña activa)
  const visibleFechas = useMemo(() => {
    if (!report) return [];
    return report.fechas.filter(fecha => (filteredTotals as any)[fecha] > 0);
  }, [report, filteredTotals]);

  const tabs = useMemo((): { id: TabType; name: string; count: number; description: string }[] => [
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
  ], [baseData, isOperadorInExternos]);

  // -------------------------------------------------
  // GUARDIAS DE RENDERIZADO – se sitúan después de
  // todos los hooks para evitar diferencias de conteo
  // entre renders y el error "Rendered more hooks than
  // during the previous render".
  // -------------------------------------------------
  if (loading) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-4 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="text-center">
          <div className="text-red-600 font-semibold mb-2">Error al cargar reporte</div>
          <p className="text-gray-600 text-sm">{error}</p>
        </div>
      </Card>
    )
  }

  if (!report || report.data.length === 0) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="text-center">
          <div className="text-gray-600 font-semibold mb-2">Sin datos</div>
          <p className="text-gray-500 text-sm">No se encontraron registros de producción para los filtros seleccionados.</p>
        </div>
      </Card>
    )
  }
  // -------------------------------------------------

  return (
    <Card className={`${className}`}>
      {/* Encabezado */}
      <div className="p-4 bg-gray-50 border-b">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Reporte de Producción</h3>
            <p className="text-sm text-gray-500">Análisis de producción por día y operador - {report.process.toUpperCase()}</p>
          </div>
          <div className="text-sm text-gray-600">
            Total: <span className="font-bold">{filteredTotals.total.toLocaleString()}</span> expedientes procesados
          </div>
        </div>

        {/* Selectores */}
        <div className="flex flex-wrap gap-4 items-center mb-4">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Días:</label>
            <select 
              value={currentFilters.days} 
              onChange={(e) => onFiltersChange({ days: Number(e.target.value) })}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value={15}>15 días</option>
              <option value={20}>20 días</option>
              <option value={30}>30 días</option>
              <option value={60}>60 días</option>
            </select>
          </div>
          
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Tipo:</label>
            <select 
              value={currentFilters.dayType} 
              onChange={(e) => onFiltersChange({ dayType: e.target.value as 'TODOS' | 'LABORABLES' | 'FIN_DE_SEMANA' })}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="TODOS">Todos</option>
              <option value="LABORABLES">Laborables</option>
              <option value="FIN_DE_SEMANA">Fin de Semana</option>
            </select>
          </div>
          
          <button
            onClick={exportToExcel}
            className="flex items-center gap-2 px-3 py-1.5 text-sm border border-gray-300 rounded-md bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            title="Exportar a Excel la vista actual"
          >
            <Download className="w-4 h-4" />
            <span>Exportar</span>
          </button>
          
          <div className="text-sm text-gray-600">
            <span className="font-medium">Mostrando:</span> {visibleFechas.length} días con datos
          </div>
        </div>

        <div className="text-sm text-gray-600">
          <span className="font-medium">Período base:</span> {report.periodo}
        </div>
      </div>

      {/* Tabs System and Filters */}
      <div className="p-4 bg-white border-b">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  // Reset filters when changing tabs
                  setSearchTerm('');
                  setSubEquipoFilter('');
                }}
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
        <div className="mt-4 flex flex-wrap gap-4 items-center">
            <div className="relative flex-grow">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                    type="text"
                    placeholder="Buscar operador..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                />
            </div>
            {activeTab === 'general' && (
                <div className="relative flex-grow">
                    <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <select
                        value={subEquipoFilter}
                        onChange={(e) => setSubEquipoFilter(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md bg-white focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="">Todos los sub-equipos</option>
                        {uniqueSubEquipos.map(subEquipo => (
                            <option key={subEquipo} value={subEquipo}>{subEquipo}</option>
                        ))}
                    </select>
                </div>
            )}
        </div>
        <div className="mt-2 text-sm text-gray-600">
          {tabs.find(tab => tab.id === activeTab)?.description}
        </div>
      </div>

      {/* Tabla para Desktop */}
      <div className="overflow-x-auto hidden md:block">
        <table className="w-full">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-100 z-10">
                Operador
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[100px]">
                Sub Equipo
              </th>
              {visibleFechas.map((fecha: string) => (
                <th 
                  key={fecha}
                  className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[60px]"
                  title={`Fecha: ${fecha} (${formatDate(fecha)})`}
                >
                  {formatDate(fecha)}
                </th>
              ))}
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider bg-blue-50 min-w-[80px]">
                Total
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredOperators.map((operadorData) => (
              <tr 
                key={operadorData.operador}
                className={`transition-colors cursor-pointer ${operadorData.colorClass || ''}`}
                onClick={() => setModalOperator(operadorData)}
              >
                <td className={`px-4 py-3 text-sm font-medium text-gray-900 sticky left-0 z-10 border-r ${operadorData.colorClass || 'bg-white'}`}>
                  <div className="max-w-[200px] truncate" title={operadorData.operador}>
                    {operadorData.operador}
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-center">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    operadorData.subEquipo === 'EVALUACION' 
                      ? 'bg-gray-100 text-gray-800'
                      : operadorData.subEquipo === 'REASIGNADOS'
                      ? 'bg-orange-200 text-orange-900'
                      : operadorData.subEquipo === 'SUSPENDIDA'
                      ? 'bg-orange-400 text-orange-950'
                      : operadorData.subEquipo === 'RESPONSABLE'
                      ? 'bg-green-200 text-green-900'
                      : 'bg-gray-300 text-gray-700'
                  }`}>
                    {operadorData.subEquipo === 'NO_ENCONTRADO' ? 'N/A' : operadorData.subEquipo}
                  </span>
                </td>
                {visibleFechas.map((fecha: string) => {
                  const count = operadorData.fechas[fecha] || 0
                  return (
                    <td 
                      key={fecha}
                      className={`px-3 py-3 text-sm text-center font-mono ${
                        count > 0 
                          ? 'text-gray-900 font-medium'
                          : 'text-gray-400'
                      }`}
                    >
                      {count > 0 ? count.toLocaleString() : '0'}
                    </td>
                  )
                })}
                <td className="px-4 py-3 text-sm text-center font-bold bg-blue-50 text-blue-900">
                  {visibleFechas.reduce((sum: number, fecha: string) => sum + (operadorData.fechas[fecha] || 0), 0).toLocaleString()}
                </td>
              </tr>
            ))}
            
            {/* Fila de totales */}
            <tr className="bg-green-100 border-t-2 border-green-300">
              <td className="px-4 py-3 text-sm font-bold text-green-900 sticky left-0 bg-green-100 z-10">
                TOTAL
              </td>
              <td className="px-4 py-3 text-sm text-center font-bold text-green-900">
                -
              </td>
              {visibleFechas.map((fecha: string) => (
                <td 
                  key={fecha}
                  className="px-3 py-3 text-sm text-center font-bold text-green-900"
                >
                  {(filteredTotals as any)[fecha]?.toLocaleString() || '0'}
                </td>
              ))}
              <td className="px-4 py-3 text-sm text-center font-bold text-green-900 bg-green-200">
                {filteredTotals.total.toLocaleString()}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Cards para Mobile */}
      <div className="block md:hidden p-4 space-y-4">
        {filteredOperators.map((operadorData) => (
          <div 
            key={operadorData.operador}
            className={`bg-white rounded-lg shadow-md border border-gray-200 p-4 ${operadorData.colorClass || ''}`}
            onClick={() => setModalOperator(operadorData)}
          >
            <div className="flex justify-between items-start mb-3">
              <div>
                <h4 className="font-bold text-gray-900 leading-tight truncate max-w-[200px]" title={operadorData.operador}>{operadorData.operador}</h4>
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  operadorData.subEquipo === 'EVALUACION' 
                    ? 'bg-gray-100 text-gray-800'
                    : operadorData.subEquipo === 'REASIGNADOS'
                    ? 'bg-orange-200 text-orange-900'
                    : operadorData.subEquipo === 'SUSPENDIDA'
                    ? 'bg-orange-400 text-orange-950'
                    : operadorData.subEquipo === 'RESPONSABLE'
                    ? 'bg-green-200 text-green-900'
                    : 'bg-gray-300 text-gray-700'
                }`}>
                  {operadorData.subEquipo === 'NO_ENCONTRADO' ? 'N/A' : operadorData.subEquipo}
                </span>
              </div>
              <div className="text-right flex-shrink-0 ml-2">
                <div className="text-xs text-gray-500">Total</div>
                <div className="text-lg font-bold text-blue-800">
                  {visibleFechas.reduce((sum: number, fecha: string) => sum + (operadorData.fechas[fecha] || 0), 0).toLocaleString()}
                </div>
              </div>
            </div>
             <p className="text-xs text-gray-500 mt-2">Toque para ver detalle diario.</p>
          </div>
        ))}
        {/* Total Card */}
        {filteredOperators.length > 0 && (
            <div className="bg-green-100 rounded-lg shadow-md border border-green-300 p-4 mt-4 sticky bottom-4">
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="font-bold text-green-900">PRODUCCIÓN TOTAL</h4>
                  <p className="text-xs text-green-800">{filteredOperators.length} operadores</p>
                </div>
                 <div className="text-right flex-shrink-0 ml-2">
                    <div className="text-2xl font-bold text-green-800">
                      {filteredTotals.total.toLocaleString()}
                    </div>
                  </div>
              </div>
            </div>
        )}
      </div>

      {/* Leyenda de colores */}
      <div className="p-4 bg-gray-50 border-t">
        <h4 className="text-sm font-medium text-gray-900 mb-3">Código de Colores por Sub Equipo:</h4>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {report.legend.map(legend => (
            <div key={legend.subEquipo} className="flex items-center space-x-2">
              <div className={`w-4 h-4 rounded ${legend.colorClass}`}></div>
              <p className="text-xs text-gray-500">{legend.subEquipo} {legend.count}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Gráfico de evolución diaria */}
      <div className="border-t">
        <ProduccionChart 
          report={filteredReport}
          loading={loading}
          className="border-0"
        />
      </div>

      {/* Modal */}
      {modalOperator && (
        <ProductionOperatorModal 
          operator={{ operador: modalOperator.operador, fechas: modalOperator.fechas }}
          orderedDates={visibleFechas}
          onClose={() => setModalOperator(null)}
        />
      )}
    </Card>
  )
} 