'use client'

import { useState } from 'react';
import { useThroughputAnalysis, ThroughputData } from '@/hooks/use-throughput-analysis';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, AreaChart, Area, TooltipContentProps } from 'recharts';
import { NameType, ValueType } from 'recharts/types/component/DefaultTooltipContent';
import { AlertCircle, TrendingUp, ArrowUp, ArrowDown, BarChart3, Activity, Calendar, Target, Table, Eye, EyeOff, Download } from 'lucide-react';
import React from 'react';
import { SectionHeader } from '@/components/ui/section-header'
import { SectionCard } from '@/components/ui/section-card'
import { FilterSelect } from '@/components/ui/filter-select'
import { Card } from './card';
import * as ExcelJS from 'exceljs';

interface ChartProps {
  proceso: 'ccm' | 'prr';
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const ingresos = payload.find((p: any) => p.dataKey === 'Ingresos')?.value || 0;
    const produccionEvaluadores = payload.find((p: any) => p.dataKey === 'Producción Evaluadores')?.value || 0;
    const aprobacionAutomatica = payload.find((p: any) => p.dataKey === 'Aprobación Automática')?.value || 0;
    const totalProduccion = produccionEvaluadores + aprobacionAutomatica;

    return (
      <div className="bg-white/95 backdrop-blur-sm p-4 rounded-lg shadow-lg border border-gray-200">
        <p className="font-bold text-gray-800 mb-2">{label}</p>
        <div className="space-y-1">
          <p className="text-blue-600 text-sm">
            <span className="inline-block w-3 h-3 bg-blue-500 rounded-full mr-2"></span>
            Ingresos: <span className="font-semibold">{ingresos.toLocaleString()}</span>
          </p>
          <p className="text-green-600 text-sm">
            <span className="inline-block w-3 h-3 bg-green-500 rounded-full mr-2"></span>
            Producción Evaluadores: <span className="font-semibold">{produccionEvaluadores.toLocaleString()}</span>
          </p>
          <p className="text-yellow-600 text-sm">
            <span className="inline-block w-3 h-3 bg-yellow-500 rounded-full mr-2"></span>
            Aprobación Automática: <span className="font-semibold">{aprobacionAutomatica.toLocaleString()}</span>
          </p>
          <div className="border-t border-gray-200 pt-1 mt-2">
            <p className="text-gray-700 text-sm font-medium">
              Total Producción: <span className="font-bold">{totalProduccion.toLocaleString()}</span>
            </p>
            <p className="text-gray-600 text-xs">
              Balance: {ingresos - totalProduccion > 0 ? '+' : ''}{(ingresos - totalProduccion).toLocaleString()}
            </p>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

// Función para calcular estadísticas de la tabla
const calculateTableStats = (data: ThroughputData[]) => {
  if (!data || data.length === 0) return null;

  const totalIngresos = data.reduce((sum, d) => sum + d.Ingresos, 0);
  const totalProduccionEvaluadores = data.reduce((sum, d) => sum + (d['Producción Evaluadores'] || 0), 0);
  const totalAprobacionAutomatica = data.reduce((sum, d) => sum + (d['Aprobación Automática'] || 0), 0);
  const totalProduccionCombinada = totalProduccionEvaluadores + totalAprobacionAutomatica;
  
  const avgIngresos = Math.round(totalIngresos / data.length);
  const avgProduccionEvaluadores = Math.round(totalProduccionEvaluadores / data.length);
  const avgAprobacionAutomatica = Math.round(totalAprobacionAutomatica / data.length);
  const avgProduccionCombinada = Math.round(totalProduccionCombinada / data.length);

  // Calcular tendencias (últimos 7 días vs anteriores)
  const recentData = data.slice(-7);
  const previousData = data.slice(-14, -7);
  
  const recentAvgIngresos = recentData.reduce((sum, d) => sum + d.Ingresos, 0) / recentData.length;
  const previousAvgIngresos = previousData.length > 0 ? previousData.reduce((sum, d) => sum + d.Ingresos, 0) / previousData.length : 0;
  
  const recentAvgProduccion = recentData.reduce((sum, d) => sum + (d['Producción Evaluadores'] || 0), 0) / recentData.length;
  const previousAvgProduccion = previousData.length > 0 ? previousData.reduce((sum, d) => sum + (d['Producción Evaluadores'] || 0), 0) / previousData.length : 0;

  const recentAvgAutomatica = recentData.reduce((sum, d) => sum + (d['Aprobación Automática'] || 0), 0) / recentData.length;
  const previousAvgAutomatica = previousData.length > 0 ? previousData.reduce((sum, d) => sum + (d['Aprobación Automática'] || 0), 0) / previousData.length : 0;

  const recentAvgCombinada = recentData.reduce((sum, d) => sum + (d['Producción Evaluadores'] || 0) + (d['Aprobación Automática'] || 0), 0) / recentData.length;
  const previousAvgCombinada = previousData.length > 0 ? previousData.reduce((sum, d) => sum + (d['Producción Evaluadores'] || 0) + (d['Aprobación Automática'] || 0), 0) / previousData.length : 0;

  const trendIngresos = previousAvgIngresos > 0 ? ((recentAvgIngresos - previousAvgIngresos) / previousAvgIngresos * 100) : 0;
  const trendProduccion = previousAvgProduccion > 0 ? ((recentAvgProduccion - previousAvgProduccion) / previousAvgProduccion * 100) : 0;
  const trendAutomatica = previousAvgAutomatica > 0 ? ((recentAvgAutomatica - previousAvgAutomatica) / previousAvgAutomatica * 100) : 0;
  const trendCombinada = previousAvgCombinada > 0 ? ((recentAvgCombinada - previousAvgCombinada) / previousAvgCombinada * 100) : 0;

  // Máximos
  const maxIngresos = Math.max(...data.map(d => d.Ingresos));
  const maxProduccionEvaluadores = Math.max(...data.map(d => d['Producción Evaluadores'] || 0));
  const maxAprobacionAutomatica = Math.max(...data.map(d => d['Aprobación Automática'] || 0));
  const maxProduccionCombinada = Math.max(...data.map(d => (d['Producción Evaluadores'] || 0) + (d['Aprobación Automática'] || 0)));

  return {
    totals: { totalIngresos, totalProduccionEvaluadores, totalAprobacionAutomatica, totalProduccionCombinada },
    averages: { avgIngresos, avgProduccionEvaluadores, avgAprobacionAutomatica, avgProduccionCombinada },
    trends: { trendIngresos, trendProduccion, trendAutomatica, trendCombinada },
    maximums: { maxIngresos, maxProduccionEvaluadores, maxAprobacionAutomatica, maxProduccionCombinada }
  };
};

const TrendIndicator = ({ value }: { value: number }) => {
  const isPositive = value > 0;
  const isNeutral = Math.abs(value) < 1;
  
  if (isNeutral) {
    return (
      <div className="flex items-center justify-center">
        <span className="text-gray-500 text-xs font-medium">~0%</span>
      </div>
    );
  }
  
  return (
    <div className={`flex items-center justify-center space-x-1 ${isPositive ? 'text-green-600' : 'text-red-500'}`}>
      {isPositive ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
      <span className="text-xs font-medium">{Math.abs(value).toFixed(1)}%</span>
    </div>
  );
};

function ThroughputChartComponent({ proceso }: ChartProps) {
  const [periodo, setPeriodo] = useState(30);
  const { data, isLoading, error } = useThroughputAnalysis(proceso, periodo);
  const [showDetailedTable, setShowDetailedTable] = useState(false);

  // ----------------------------------------------------
  // GUARDIA DE RENDERIZADO TEMPRANO
  // ----------------------------------------------------
  if (isLoading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200 flex justify-center items-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando análisis de throughput...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200 flex justify-center items-center h-96">
        <div className="text-center text-red-600">
          <AlertCircle className="h-8 w-8 mx-auto mb-2" />
          <p>Error al cargar el análisis:</p>
          <p className="text-sm">{(error as Error).message}</p>
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200 flex justify-center items-center h-96">
        <div className="text-center text-gray-500">
          <BarChart3 className="h-8 w-8 mx-auto mb-2" />
          <p>No hay datos suficientes para el análisis.</p>
        </div>
      </div>
    )
  }
  // ----------------------------------------------------

  const tableStats = calculateTableStats(data);
  
  const exportDetailedToExcel = async () => {
    if (!data) return;

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(`Throughput Detallado - ${periodo} días`);

    worksheet.columns = [
      { header: 'Fecha', key: 'fecha', width: 15 },
      { header: 'Ingresos', key: 'ingresos', width: 15 },
      { header: 'Producción Evaluadores', key: 'prodEval', width: 25 },
      { header: 'Aprobación Automática', key: 'aprobAuto', width: 25 },
      { header: 'Balance', key: 'balance', width: 15 },
    ];
    worksheet.getRow(1).font = { bold: true };

    data.forEach(d => {
      const prodEval = d['Producción Evaluadores'] || 0;
      const aprobAuto = d['Aprobación Automática'] || 0;
      worksheet.addRow({
        fecha: d.fecha,
        ingresos: d.Ingresos,
        prodEval: prodEval,
        aprobAuto: aprobAuto,
        balance: d.Ingresos - (prodEval + aprobAuto),
      });
    });
    
    // Fila de totales
    if(tableStats) {
      const totalRow = worksheet.addRow({
        fecha: 'TOTAL',
        ingresos: tableStats.totals.totalIngresos,
        prodEval: tableStats.totals.totalProduccionEvaluadores,
        aprobAuto: tableStats.totals.totalAprobacionAutomatica,
        balance: tableStats.totals.totalIngresos - tableStats.totals.totalProduccionCombinada,
      });
      totalRow.font = { bold: true };
      totalRow.eachCell(cell => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFE0E7FF' }
        };
      });
    }


    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `throughput_detallado_${proceso}_${periodo}dias.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <SectionCard>
      <SectionHeader
        icon={<TrendingUp className="h-6 w-6 text-blue-600" />}
        title="Análisis de Ingresos vs. Producción"
        description="Comparativa diaria de expedientes entrantes vs. producción combinada (evaluadores + automática)."
        actions={
          <FilterSelect
            value={periodo}
            onChange={(e) => setPeriodo(Number(e.target.value))}
            icon={<Calendar className="h-4 w-4" />}
            containerClassName="w-full sm:w-48"
          >
            {[7, 15, 30, 60, 90].map((dias) => (
              <option key={dias} value={dias}>
                {dias} días
              </option>
            ))}
          </FilterSelect>
        }
      />

      <div className="mt-6 space-y-6">
        {/* Gráfico mejorado con área apilada */}
        <Card className="p-6 bg-white">
          <div className="h-96">
            {isLoading && <p className="text-center pt-16">Cargando datos del gráfico...</p>}
            {error && (
              <div className="flex flex-col items-center justify-center h-full text-red-600">
                <AlertCircle className="h-8 w-8 mb-2"/>
                <p>Error al cargar el análisis:</p>
                <p className="text-sm">{(error as Error).message}</p>
              </div>
            )}
            {!isLoading && !error && data && (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 20 }}>
                  <defs>
                    <linearGradient id="colorProduccionEvaluadores" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#82ca9d" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#82ca9d" stopOpacity={0.3}/>
                    </linearGradient>
                    <linearGradient id="colorAprobacionAutomatica" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ffc658" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#ffc658" stopOpacity={0.4}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                  <XAxis dataKey="fecha" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" className="hidden sm:block" interval="preserveStartEnd" />
                  <XAxis dataKey="fecha" tick={{ fontSize: 9 }} className="block sm:hidden" interval={3} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend verticalAlign="top" height={36} />
                  
                  {/* Áreas apiladas para mostrar producción combinada */}
                  <Area 
                    type="monotone" 
                    dataKey="Producción Evaluadores" 
                    stackId="1"
                    stroke="#82ca9d" 
                    fill="url(#colorProduccionEvaluadores)"
                    strokeWidth={2}
                    name="Producción Evaluadores"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="Aprobación Automática" 
                    stackId="1"
                    stroke="#ffc658" 
                    fill="url(#colorAprobacionAutomatica)"
                    strokeWidth={2}
                    name="Aprobación Automática"
                  />
                  
                  {/* Línea de ingresos encima */}
                  <Line 
                    type="monotone" 
                    dataKey="Ingresos" 
                    stroke="#8884d8" 
                    strokeWidth={3}
                    name="Ingresos"
                    dot={{ fill: '#8884d8', strokeWidth: 2, r: 3 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        {/* Tabla de métricas resumidas */}
        {!isLoading && !error && data && tableStats && (
          <Card className="overflow-hidden bg-white">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="text-lg font-semibold text-gray-800 flex items-center">
                    <BarChart3 className="h-5 w-5 mr-2 text-indigo-600"/>
                    Métricas Detalladas de Throughput
                  </h4>
                  <p className="text-sm text-gray-600 mt-1">
                    Estadísticas completas para los últimos {periodo} días
                  </p>
                </div>
                <button
                  onClick={() => setShowDetailedTable(!showDetailedTable)}
                  className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    showDetailedTable 
                      ? 'bg-red-500 text-white hover:bg-red-600' 
                      : 'bg-blue-500 text-white hover:bg-blue-600'
                  }`}
                >
                  {showDetailedTable ? (
                    <>
                      <EyeOff className="h-4 w-4 mr-2" />
                      Ocultar Tabla Detallada
                    </>
                  ) : (
                    <>
                      <Table className="h-4 w-4 mr-2" />
                      Mostrar Tabla Detallada
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Vista de Tabla para Desktop */}
            <div className="overflow-x-auto hidden md:block">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Métrica
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-blue-600 uppercase tracking-wider">
                      <div className="flex items-center justify-center space-x-1">
                        <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                        <span>Ingresos</span>
                      </div>
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-green-600 uppercase tracking-wider">
                      <div className="flex items-center justify-center space-x-1">
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        <span>Producción Evaluadores</span>
                      </div>
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-yellow-600 uppercase tracking-wider">
                      <div className="flex items-center justify-center space-x-1">
                        <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                        <span>Aprob. Automática</span>
                      </div>
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-purple-600 uppercase tracking-wider">
                      <div className="flex items-center justify-center space-x-1">
                        <div className="w-3 h-3 bg-gradient-to-r from-green-500 to-yellow-500 rounded-full"></div>
                        <span>Total Producción</span>
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {/* Total */}
                  <tr className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Target className="h-4 w-4 text-purple-500 mr-2"/>
                        <div>
                          <div className="text-sm font-medium text-gray-900">Total Acumulado</div>
                          <div className="text-xs text-gray-500">Suma de {periodo} días</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="text-lg font-bold text-blue-600">
                        {tableStats.totals.totalIngresos.toLocaleString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="text-lg font-bold text-green-600">
                        {tableStats.totals.totalProduccionEvaluadores.toLocaleString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="text-lg font-bold text-yellow-600">
                        {tableStats.totals.totalAprobacionAutomatica.toLocaleString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="text-lg font-bold text-purple-600">
                        {tableStats.totals.totalProduccionCombinada.toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {tableStats.totals.totalIngresos - tableStats.totals.totalProduccionCombinada > 0 ? 'Déficit: ' : 'Superávit: '}
                        <span className={tableStats.totals.totalIngresos - tableStats.totals.totalProduccionCombinada > 0 ? 'text-red-600' : 'text-green-600'}>
                          {Math.abs(tableStats.totals.totalIngresos - tableStats.totals.totalProduccionCombinada).toLocaleString()}
                        </span>
                      </div>
                    </td>
                  </tr>

                  {/* Promedio */}
                  <tr className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Activity className="h-4 w-4 text-blue-500 mr-2"/>
                        <div>
                          <div className="text-sm font-medium text-gray-900">Promedio Diario</div>
                          <div className="text-xs text-gray-500">Media del período</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="text-lg font-semibold text-blue-600">
                        {tableStats.averages.avgIngresos.toLocaleString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="text-lg font-semibold text-green-600">
                        {tableStats.averages.avgProduccionEvaluadores.toLocaleString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="text-lg font-semibold text-yellow-600">
                        {tableStats.averages.avgAprobacionAutomatica.toLocaleString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="text-lg font-semibold text-purple-600">
                        {tableStats.averages.avgProduccionCombinada.toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        Balance diario: 
                        <span className={tableStats.averages.avgIngresos - tableStats.averages.avgProduccionCombinada > 0 ? 'text-red-600' : 'text-green-600'}>
                          {tableStats.averages.avgIngresos - tableStats.averages.avgProduccionCombinada > 0 ? ' -' : ' +'}
                          {Math.abs(tableStats.averages.avgIngresos - tableStats.averages.avgProduccionCombinada).toLocaleString()}
                        </span>
                      </div>
                    </td>
                  </tr>

                  {/* Máximo */}
                  <tr className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <TrendingUp className="h-4 w-4 text-emerald-500 mr-2"/>
                        <div>
                          <div className="text-sm font-medium text-gray-900">Pico Máximo</div>
                          <div className="text-xs text-gray-500">Día de mayor volumen</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                        {tableStats.maximums.maxIngresos.toLocaleString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                        {tableStats.maximums.maxProduccionEvaluadores.toLocaleString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
                        {tableStats.maximums.maxAprobacionAutomatica.toLocaleString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800">
                        {tableStats.maximums.maxProduccionCombinada.toLocaleString()}
                      </div>
                    </td>
                  </tr>

                  {/* Tendencia */}
                  <tr className="hover:bg-gray-50 transition-colors bg-gradient-to-r from-gray-50/50 to-blue-50/30">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 text-indigo-500 mr-2"/>
                        <div>
                          <div className="text-sm font-medium text-gray-900">Tendencia (7 días)</div>
                          <div className="text-xs text-gray-500">vs. período anterior</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <TrendIndicator value={tableStats.trends.trendIngresos} />
                    </td>
                    <td className="px-6 py-4 text-center">
                      <TrendIndicator value={tableStats.trends.trendProduccion} />
                    </td>
                    <td className="px-6 py-4 text-center">
                      <TrendIndicator value={tableStats.trends.trendAutomatica} />
                    </td>
                    <td className="px-6 py-4 text-center">
                      <TrendIndicator value={tableStats.trends.trendCombinada} />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Vista de Tarjetas para Mobile */}
            <div className="block md:hidden space-y-4 p-4">
              {Object.entries({
                'Total Acumulado': { data: tableStats.totals, icon: Target, isTotal: true },
                'Promedio Diario': { data: tableStats.averages, icon: Activity, isTotal: false },
                'Pico Máximo': { data: tableStats.maximums, icon: TrendingUp, isTotal: false },
                'Tendencia (7d)': { data: tableStats.trends, icon: Calendar, isTotal: false }
              }).map(([title, { data, icon: Icon, isTotal }]) => (
                <div key={title} className="bg-white rounded-lg shadow border border-gray-200 p-3">
                  <div className="flex items-center text-gray-700 font-semibold mb-3">
                    <Icon className="h-4 w-4 mr-2" />
                    <span>{title}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="bg-blue-50 p-2 rounded-md">
                      <div className="text-xs text-blue-800">Ingresos</div>
                      <div className="font-bold text-lg text-blue-900">
                        {isTotal ? (data as any).totalIngresos.toLocaleString() : isNaN((data as any).trendIngresos) ? (data as any).avgIngresos?.toLocaleString() || (data as any).maxIngresos?.toLocaleString() : <TrendIndicator value={(data as any).trendIngresos} />}
                      </div>
                    </div>
                    <div className="bg-purple-50 p-2 rounded-md">
                      <div className="text-xs text-purple-800">Total Prod.</div>
                      <div className="font-bold text-lg text-purple-900">
                        {isTotal ? (data as any).totalProduccionCombinada.toLocaleString() : isNaN((data as any).trendCombinada) ? (data as any).avgProduccionCombinada?.toLocaleString() || (data as any).maxProduccionCombinada?.toLocaleString() : <TrendIndicator value={(data as any).trendCombinada} />}
                      </div>
                    </div>
                    <div className="bg-green-50 p-2 rounded-md">
                      <div className="text-xs text-green-800">Prod. Eval.</div>
                      <div className="font-semibold text-green-900">
                        {isTotal ? (data as any).totalProduccionEvaluadores.toLocaleString() : isNaN((data as any).trendProduccion) ? (data as any).avgProduccionEvaluadores?.toLocaleString() || (data as any).maxProduccionEvaluadores?.toLocaleString() : <TrendIndicator value={(data as any).trendProduccion} />}
                      </div>
                      <div className="text-xs text-green-800">Prod. Auto.</div>
                      <div className="font-semibold text-green-900">
                        {isTotal ? (data as any).totalAprobacionAutomatica.toLocaleString() : isNaN((data as any).trendAutomatica) ? (data as any).avgAprobacionAutomatica?.toLocaleString() || (data as any).maxAprobacionAutomatica?.toLocaleString() : <TrendIndicator value={(data as any).trendAutomatica} />}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Tabla detallada (opcional) */}
            {showDetailedTable && (
              <div className="p-4 border-t border-gray-200">
                <div className="flex justify-between items-center mb-2">
                  <h5 className="text-sm font-semibold text-gray-700">Datos Diarios Detallados</h5>
                  <button
                    onClick={exportDetailedToExcel}
                    className="flex items-center gap-2 px-3 py-1.5 text-xs border border-gray-300 rounded-md bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <Download className="w-3 h-3" />
                    Exportar
                  </button>
                </div>
                <div className="max-h-96 overflow-y-auto border rounded-lg">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-100 sticky top-0">
                      <tr>
                        <th className="py-2 px-3 text-left font-medium text-gray-600 uppercase tracking-wider">Fecha</th>
                        <th className="py-2 px-3 text-right font-medium text-gray-600 uppercase tracking-wider">Ingresos</th>
                        <th className="py-2 px-3 text-right font-medium text-gray-600 uppercase tracking-wider">Prod. Eval.</th>
                        <th className="py-2 px-3 text-right font-medium text-gray-600 uppercase tracking-wider">Aprob. Auto.</th>
                        <th className="py-2 px-3 text-right font-medium text-gray-600 uppercase tracking-wider">Balance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {data.map((d, i) => {
                        const prodEval = d['Producción Evaluadores'] || 0
                        const aprobAuto = d['Aprobación Automática'] || 0
                        const balance = d.Ingresos - (prodEval + aprobAuto)
                        return (
                          <tr key={i} className="hover:bg-gray-50">
                            <td className="py-2 px-3 font-medium whitespace-nowrap">{d.fecha}</td>
                            <td className="py-2 px-3 text-right font-mono">{d.Ingresos.toLocaleString()}</td>
                            <td className="py-2 px-3 text-right font-mono">{prodEval.toLocaleString()}</td>
                            <td className="py-2 px-3 text-right font-mono">{aprobAuto.toLocaleString()}</td>
                            <td className={`py-2 px-3 text-right font-mono font-semibold ${balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                              {balance.toLocaleString()}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                    {tableStats && (
                      <tfoot className="bg-gray-100 font-bold">
                        <tr>
                          <td className="py-2 px-3 text-left">TOTAL</td>
                          <td className="py-2 px-3 text-right font-mono">{tableStats.totals.totalIngresos.toLocaleString()}</td>
                          <td className="py-2 px-3 text-right font-mono">{tableStats.totals.totalProduccionEvaluadores.toLocaleString()}</td>
                          <td className="py-2 px-3 text-right font-mono">{tableStats.totals.totalAprobacionAutomatica.toLocaleString()}</td>
                          <td className="py-2 px-3 text-right font-mono">{(tableStats.totals.totalIngresos - tableStats.totals.totalProduccionCombinada).toLocaleString()}</td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </div>
            )}
          </Card>
        )}
      </div>
    </SectionCard>
  );
}

const ThroughputChart = React.memo(ThroughputChartComponent);
export { ThroughputChart }; 