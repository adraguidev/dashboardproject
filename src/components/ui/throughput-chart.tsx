'use client'

import { useState } from 'react';
import { useThroughputAnalysis, ThroughputData } from '@/hooks/use-throughput-analysis';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, AreaChart, Area } from 'recharts';
import { AlertCircle, TrendingUp, ArrowUp, ArrowDown, BarChart3, Activity, Calendar, Target, Table, Eye, EyeOff } from 'lucide-react';

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

export function ThroughputChart({ proceso }: ChartProps) {
  const [periodo, setPeriodo] = useState(30);
  const { data, isLoading, error } = useThroughputAnalysis(proceso, periodo);
  const [showDetailedTable, setShowDetailedTable] = useState(false);

  const tableStats = data ? calculateTableStats(data) : null;

  return (
    <div className="space-y-6">
      {/* Gráfico mejorado con área apilada */}
      <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 flex items-center">
              <TrendingUp className="h-5 w-5 mr-2 text-blue-600"/>
              Análisis de Throughput: Ingresos vs. Producción Total
            </h3>
            <p className="text-sm text-gray-500">Comparativa diaria de expedientes entrantes vs. producción combinada (evaluadores + automática).</p>
          </div>
          <div className="flex items-center space-x-1 bg-gray-100 p-1.5 rounded-lg">
            {[7, 15, 30, 60, 90].map((dias) => (
              <button
                key={dias}
                onClick={() => setPeriodo(dias)}
                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  periodo === dias
                    ? 'bg-blue-500 text-white shadow-md'
                    : 'text-gray-600 hover:bg-white'
                }`}
              >
                {dias} días
              </button>
            ))}
          </div>
        </div>

        <div className="h-96">
          {isLoading && <p className="text-center pt-16">Cargando datos del gráfico...</p>}
          {error && (
            <div className="flex flex-col items-center justify-center h-full text-red-600">
              <AlertCircle className="h-8 w-8 mb-2"/>
              <p>Error al cargar el análisis:</p>
              <p className="text-sm">{error.message}</p>
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
                <XAxis dataKey="fecha" tick={{ fontSize: 11 }} angle={-30} textAnchor="end" />
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
      </div>

      {/* Tabla de métricas resumidas */}
      {!isLoading && !error && data && tableStats && (
        <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
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

          <div className="overflow-x-auto">
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

          {/* Footer con información adicional */}
          <div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>💡 Las áreas muestran la producción total combinada (evaluadores + automática)</span>
              <span>📊 Datos actualizados en tiempo real</span>
            </div>
          </div>
        </div>
      )}

      {/* Tabla detallada día por día */}
      {!isLoading && !error && data && showDetailedTable && (
        <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-r from-green-50 to-purple-50 p-6 border-b border-gray-200">
            <h4 className="text-lg font-semibold text-gray-800 flex items-center">
              <Table className="h-5 w-5 mr-2 text-purple-600"/>
              Datos Detallados por Día
            </h4>
            <p className="text-sm text-gray-600 mt-1">
              Desglose completo día a día para los últimos {periodo} días
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider sticky left-0 bg-gray-50 z-10 border-r border-gray-200">
                    Métrica
                  </th>
                  {data.map((item, index) => (
                    <th key={index} className="px-3 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider min-w-[80px]">
                      {item.fecha}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {/* Fila de Ingresos */}
                <tr className="hover:bg-blue-50/30 transition-colors">
                  <td className="px-4 py-3 whitespace-nowrap sticky left-0 bg-white z-10 border-r border-gray-200">
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
                      <span className="text-sm font-medium text-gray-900">Ingresos</span>
                    </div>
                  </td>
                  {data.map((item, index) => (
                    <td key={index} className="px-3 py-3 text-center">
                      <span className="text-blue-600 font-semibold">
                        {item.Ingresos.toLocaleString()}
                      </span>
                    </td>
                  ))}
                </tr>

                {/* Fila de Producción Evaluadores */}
                <tr className="hover:bg-green-50/30 transition-colors">
                  <td className="px-4 py-3 whitespace-nowrap sticky left-0 bg-white z-10 border-r border-gray-200">
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                      <span className="text-sm font-medium text-gray-900">Producción Evaluadores</span>
                    </div>
                  </td>
                  {data.map((item, index) => (
                    <td key={index} className="px-3 py-3 text-center">
                      <span className="text-green-600 font-semibold">
                        {item['Producción Evaluadores'].toLocaleString()}
                      </span>
                    </td>
                  ))}
                </tr>

                {/* Fila de Aprobación Automática */}
                <tr className="hover:bg-yellow-50/30 transition-colors">
                  <td className="px-4 py-3 whitespace-nowrap sticky left-0 bg-white z-10 border-r border-gray-200">
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-yellow-500 rounded-full mr-2"></div>
                      <span className="text-sm font-medium text-gray-900">Aprobación Automática</span>
                    </div>
                  </td>
                  {data.map((item, index) => (
                    <td key={index} className="px-3 py-3 text-center">
                      <span className="text-yellow-600 font-semibold">
                        {item['Aprobación Automática'].toLocaleString()}
                      </span>
                    </td>
                  ))}
                </tr>

                {/* Fila de Total Producción */}
                <tr className="hover:bg-purple-50/30 transition-colors bg-gradient-to-r from-purple-50/20 to-blue-50/20">
                  <td className="px-4 py-3 whitespace-nowrap sticky left-0 bg-gradient-to-r from-purple-50 to-blue-50 z-10 border-r border-gray-200">
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-gradient-to-r from-green-500 to-yellow-500 rounded-full mr-2"></div>
                      <span className="text-sm font-medium text-gray-900">Total Producción</span>
                    </div>
                  </td>
                  {data.map((item, index) => {
                    const total = item['Producción Evaluadores'] + item['Aprobación Automática'];
                    const balance = item.Ingresos - total;
                    return (
                      <td key={index} className="px-3 py-3 text-center">
                        <div className="space-y-1">
                          <span className="text-purple-600 font-bold">
                            {total.toLocaleString()}
                          </span>
                          <div className={`text-xs ${balance > 0 ? 'text-red-500' : balance < 0 ? 'text-green-500' : 'text-gray-500'}`}>
                            {balance > 0 ? `↑ +${balance}` : (balance < 0 ? `↓ ${balance}` : '=')}
                          </div>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          </div>

          {/* Footer de la tabla detallada */}
          <div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>🔍 Vista detallada día por día</span>
              <span>
                ↑ Déficit (ingresos &gt; producción) | 
                ↓ Superávit (producción &gt; ingresos) | 
                = Equilibrio
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 