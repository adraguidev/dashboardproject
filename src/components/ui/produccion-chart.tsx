'use client'

import { useMemo } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  ComposedChart,
  Area,
  AreaChart,
  ReferenceLine
} from 'recharts'
import { Card } from '@/components/ui/card'
import { ProduccionReportSummary } from '@/types/dashboard'
import { TrendingUp, TrendingDown, Calendar, Users, BarChart3 } from 'lucide-react'

interface ProduccionChartProps {
  report: ProduccionReportSummary | null
  loading?: boolean
  className?: string
}

export function ProduccionChart({ report, loading = false, className = '' }: ProduccionChartProps) {
  // Preparar datos para el gráfico (solo días con datos > 0)
  const chartData = useMemo(() => {
    if (!report || !report.fechas.length) return []

    return report.fechas
      .map(fecha => {
        const count = report.totalByDate[fecha] || 0
        const day = new Date(fecha).getDay()
        const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
        
        return {
          fecha,
          fechaCorta: new Date(fecha).toLocaleDateString('es-ES', { 
            month: '2-digit', 
            day: '2-digit' 
          }),
          fechaCompleta: new Date(fecha).toLocaleDateString('es-ES', { 
            weekday: 'long',
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          }),
          dia: dayNames[day],
          produccion: count,
          esFinDeSemana: day === 0 || day === 6,
          fechaDate: new Date(fecha)
        }
      })
      .filter(item => item.produccion > 0) // Solo días con datos
      .sort((a, b) => a.fechaDate.getTime() - b.fechaDate.getTime()) // Ordenar cronológicamente (más antiguo a más reciente)
  }, [report])

  // Preparar datos para gráfico de promedios (agrupado por día de la semana)
  const averageData = useMemo(() => {
    if (!chartData.length) return []

    const dayGroups = chartData.reduce((acc, item) => {
      const dayKey = item.dia
      if (!acc[dayKey]) {
        acc[dayKey] = { total: 0, count: 0, dias: [] }
      }
      acc[dayKey].total += item.produccion
      acc[dayKey].count += 1
      acc[dayKey].dias.push(item.produccion)
      return acc
    }, {} as Record<string, { total: number; count: number; dias: number[] }>)

    const dayOrder = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
    
    return dayOrder
      .filter(day => dayGroups[day])
      .map(day => {
        const group = dayGroups[day]
        const promedio = group.total / group.count
        const mediana = [...group.dias].sort((a, b) => a - b)[Math.floor(group.dias.length / 2)]
        
        return {
          dia: day,
          promedio: Math.round(promedio),
          mediana: Math.round(mediana),
          minimo: Math.min(...group.dias),
          maximo: Math.max(...group.dias),
          diasTrabajados: group.count
        }
      })
  }, [chartData])

  // Calcular línea de tendencia de últimos 15 días
  const trendlineData = useMemo(() => {
    if (chartData.length < 2) return []
    
    const last15Days = chartData.slice(-15) // Últimos 15 días
    if (last15Days.length < 2) return []

    // Regresión lineal simple
    const n = last15Days.length
    const sumX = last15Days.reduce((sum, _, i) => sum + i, 0)
    const sumY = last15Days.reduce((sum, item) => sum + item.produccion, 0)
    const sumXY = last15Days.reduce((sum, item, i) => sum + i * item.produccion, 0)
    const sumX2 = last15Days.reduce((sum, _, i) => sum + i * i, 0)

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX)
    const intercept = (sumY - slope * sumX) / n

    return chartData.map((item, index) => ({
      ...item,
      tendencia: slope * index + intercept
    }))
  }, [chartData])

  // Calcular estadísticas
  const stats = useMemo(() => {
    if (!chartData.length) return null

    const valores = chartData.map(d => d.produccion)
    const total = valores.reduce((sum, val) => sum + val, 0)
    const promedio = total / valores.length
    const maximo = Math.max(...valores)
    const minimo = Math.min(...valores)
    
    // Calcular tendencia de últimos 15 días
    const last15Values = valores.slice(-15)
    const last15Total = last15Values.reduce((sum, val) => sum + val, 0)
    const last15Promedio = last15Values.length > 0 ? last15Total / last15Values.length : 0
    
    // Comparar últimos 15 días vs promedio general
    const tendencia15Dias = last15Promedio - promedio
    
    // Días con mayor y menor producción
    const diaMaximo = chartData.find(d => d.produccion === maximo)
    const diaMinimo = chartData.find(d => d.produccion === minimo)

    // Calcular volatilidad (desviación estándar)
    const varianza = valores.reduce((sum, val) => sum + Math.pow(val - promedio, 2), 0) / valores.length
    const volatilidad = Math.sqrt(varianza)

    return {
      total,
      promedio,
      maximo,
      minimo,
      tendencia15Dias,
      last15Promedio,
      diaMaximo,
      diaMinimo,
      diasConDatos: valores.length,
      volatilidad
    }
  }, [chartData])

  // Tooltip personalizado
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null

    const data = payload[0].payload
    return (
      <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg">
        <p className="font-semibold text-gray-900 mb-2">{data.fechaCompleta}</p>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
          <span className="text-sm text-gray-600">Expedientes procesados:</span>
          <span className="font-bold text-blue-600">{data.produccion.toLocaleString()}</span>
        </div>
        {data.esFinDeSemana && (
          <p className="text-xs text-orange-600 mt-1">📅 Fin de semana</p>
        )}
      </div>
    )
  }

  if (loading) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </Card>
    )
  }

  if (!report || !chartData.length) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="text-center">
          <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <div className="text-gray-600 font-semibold mb-2">Sin datos para gráfico</div>
          <p className="text-gray-500 text-sm">No hay datos suficientes para mostrar el gráfico de tendencia</p>
        </div>
      </Card>
    )
  }

  return (
    <Card className={`overflow-hidden ${className}`}>
      {/* Header del gráfico */}
      <div className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <TrendingUp className="h-6 w-6 text-blue-600" />
              Evolución de Producción Diaria
            </h3>
            <p className="text-gray-600 mt-1">
              Análisis de tendencias - {report.process.toUpperCase()} | {report.periodo}
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-blue-600">
              {stats?.total.toLocaleString()}
            </div>
            <div className="text-sm text-gray-500">Total procesados</div>
          </div>
        </div>

        {/* Estadísticas rápidas */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="bg-white rounded-lg p-3 shadow-sm">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-green-600" />
                <span className="text-sm text-gray-600">Promedio diario</span>
              </div>
              <div className="text-lg font-bold text-green-600">
                {Math.round(stats.promedio).toLocaleString()}
              </div>
            </div>
            
            <div className="bg-white rounded-lg p-3 shadow-sm">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-blue-600" />
                <span className="text-sm text-gray-600">Máximo día</span>
              </div>
              <div className="text-lg font-bold text-blue-600">
                {stats.maximo.toLocaleString()}
              </div>
              <div className="text-xs text-gray-500">
                {stats.diaMaximo?.fechaCorta}
              </div>
            </div>
            
            <div className="bg-white rounded-lg p-3 shadow-sm">
              <div className="flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-orange-600" />
                <span className="text-sm text-gray-600">Mínimo día</span>
              </div>
              <div className="text-lg font-bold text-orange-600">
                {stats.minimo.toLocaleString()}
              </div>
              <div className="text-xs text-gray-500">
                {stats.diaMinimo?.fechaCorta}
              </div>
            </div>
            
            <div className="bg-white rounded-lg p-3 shadow-sm">
              <div className="flex items-center gap-2">
                {stats.tendencia15Dias >= 0 ? (
                  <TrendingUp className="h-4 w-4 text-green-600" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-600" />
                )}
                <span className="text-sm text-gray-600">Tendencia 15D</span>
              </div>
              <div className={`text-lg font-bold ${stats.tendencia15Dias >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {stats.tendencia15Dias >= 0 ? '+' : ''}{Math.round(stats.tendencia15Dias)}
              </div>
              <div className="text-xs text-gray-500">
                vs promedio general
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Gráfico Principal - Producción Diaria */}
      <div className="p-6">
        <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          📈 Producción Diaria Total
          <span className="text-sm font-normal text-gray-500">({chartData.length} días con datos)</span>
        </h4>
        
        <div className="h-96 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={trendlineData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
              <CartesianGrid strokeDasharray="2 2" stroke="#f1f5f9" />
              <XAxis 
                dataKey="fechaCorta" 
                stroke="#64748b"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: '#cbd5e1' }}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis 
                stroke="#64748b"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: '#cbd5e1' }}
                tickFormatter={(value) => value.toLocaleString()}
              />
              <Tooltip content={<CustomTooltip />} />
              
              {/* Área de fondo con gradiente más sutil */}
              <Area
                type="monotone"
                dataKey="produccion"
                stroke="none"
                fill="url(#colorGradient)"
                fillOpacity={0.08}
              />
              
              {/* Línea de tendencia (últimos 15 días) */}
              {trendlineData.length > 15 && (
                <Line
                  type="monotone"
                  dataKey="tendencia"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  strokeDasharray="8 4"
                  dot={false}
                  activeDot={false}
                />
              )}
              
              {/* Línea principal con estilo mejorado */}
              <Line
                type="monotone"
                dataKey="produccion"
                stroke="#2563eb"
                strokeWidth={3}
                dot={{ fill: '#2563eb', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 7, fill: '#1d4ed8', stroke: 'white', strokeWidth: 2 }}
              />
              
              {/* Línea de promedio */}
              {stats && (
                <ReferenceLine 
                  y={stats.promedio} 
                  stroke="#10b981" 
                  strokeDasharray="6 6" 
                  strokeWidth={2}
                  label={{ 
                    value: `📊 Promedio: ${Math.round(stats.promedio)}`, 
                    position: "right",
                    offset: 10
                  }}
                />
              )}
              
              {/* Línea de promedio últimos 15 días */}
              {stats && stats.last15Promedio && (
                <ReferenceLine 
                  y={stats.last15Promedio} 
                  stroke="#f59e0b" 
                  strokeDasharray="4 4" 
                  strokeWidth={2}
                  label={{ 
                    value: `📈 Últimos 15D: ${Math.round(stats.last15Promedio)}`, 
                    position: "right",
                    offset: 10
                  }}
                />
              )}
              
              {/* Gradientes mejorados */}
              <defs>
                <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.15}/>
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                </linearGradient>
              </defs>
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Gráfico Secundario - Promedio por Día de la Semana */}
      <div className="p-6 border-t bg-slate-50">
        <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          📊 Promedio por Día de la Semana
          <span className="text-sm font-normal text-gray-500">(análisis de patrones)</span>
        </h4>
        
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={averageData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="2 2" stroke="#e2e8f0" />
              <XAxis 
                dataKey="dia" 
                stroke="#64748b"
                fontSize={12}
                tickLine={false}
                axisLine={{ stroke: '#cbd5e1' }}
              />
              <YAxis 
                stroke="#64748b"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: '#cbd5e1' }}
                tickFormatter={(value) => value.toLocaleString()}
              />
              <Tooltip 
                content={({ active, payload, label }) => {
                  if (!active || !payload || !payload.length) return null
                  const data = payload[0].payload
                  return (
                    <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg">
                      <p className="font-semibold text-gray-900 mb-2">📅 {label}</p>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span>Promedio:</span>
                          <span className="font-bold text-blue-600">{data.promedio.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Mediana:</span>
                          <span className="font-medium text-green-600">{data.mediana.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Rango:</span>
                          <span className="text-gray-600">{data.minimo} - {data.maximo}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Días trabajados:</span>
                          <span className="text-purple-600">{data.diasTrabajados}</span>
                        </div>
                      </div>
                    </div>
                  )
                }}
              />
              
              {/* Barras para promedio */}
              <Bar
                dataKey="promedio"
                fill="#3b82f6"
                opacity={0.7}
                radius={[4, 4, 0, 0]}
              />
              
              {/* Línea para mediana */}
              <Line
                type="monotone"
                dataKey="mediana"
                stroke="#10b981"
                strokeWidth={3}
                dot={{ fill: '#10b981', strokeWidth: 2, r: 5 }}
                activeDot={{ r: 7, fill: '#059669' }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Información detallada */}
      <div className="p-6 bg-gray-50 border-t">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="font-medium text-gray-700">📊 Días activos:</span>
            <span className="ml-2 text-gray-600 font-semibold">{stats?.diasConDatos}</span>
          </div>
          <div>
            <span className="font-medium text-gray-700">📈 Mejor día:</span>
            <span className="ml-2 text-green-600 font-medium">
              {stats?.diaMaximo?.dia} {stats?.diaMaximo?.fechaCorta} ({stats?.maximo.toLocaleString()})
            </span>
          </div>
          <div>
            <span className="font-medium text-gray-700">📉 Menor día:</span>
            <span className="ml-2 text-red-600 font-medium">
              {stats?.diaMinimo?.dia} {stats?.diaMinimo?.fechaCorta} ({stats?.minimo.toLocaleString()})
            </span>
          </div>
          <div>
            <span className="font-medium text-gray-700">🎯 Volatilidad:</span>
            <span className="ml-2 text-orange-600 font-medium">
              ±{stats ? Math.round(stats.volatilidad) : 0}
            </span>
          </div>
        </div>
        
        <div className="mt-4 text-xs text-gray-500 space-y-1">
          <p>📈 <strong>Línea azul:</strong> Producción diaria real | 📊 <strong>Verde:</strong> Promedio general | 🟡 <strong>Naranja:</strong> Tendencia últimos 15 días</p>
          <p>🔴 <strong>Puntos rojos:</strong> Días mínimos | 🟢 <strong>Puntos verdes:</strong> Días máximos | 🟠 <strong>Puntos naranjas:</strong> Fines de semana</p>
        </div>
      </div>
    </Card>
  )
} 