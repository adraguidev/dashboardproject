'use client'

import { useState, useMemo } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { Card } from '@/components/ui/card'
import type { IngresosReport } from '@/types/dashboard'
import { formatDateSafe } from '@/lib/date-utils'
import { MonthlyIngresosTable } from './monthly-ingresos-table'
import { WeeklyIngresosTable } from './weekly-ingresos-table'

interface IngresosChartProps {
  report: IngresosReport | null
  loading?: boolean
  error?: string | null
  className?: string
  onPeriodChange?: (days: number) => void
}

export function IngresosChart({ 
  report, 
  loading = false, 
  error = null, 
  className = '',
  onPeriodChange 
}: IngresosChartProps) {
  const [selectedPeriod, setSelectedPeriod] = useState(30)

  // Procesar datos para el gráfico
  const chartData = useMemo(() => {
    if (!report) return []
    
    return report.data.map(item => ({
      ...item,
      fechaLabel: formatDateSafe(item.fecha, { 
        day: '2-digit',
        month: '2-digit'
      })
    }))
  }, [report])

  // Calcular estadísticas del período
  const stats = useMemo(() => {
    if (!report) return null
    
    const maxTramites = Math.max(...report.data.map(d => d.numeroTramite))
    const minTramites = Math.min(...report.data.map(d => d.numeroTramite))
    const diasConIngresos = report.data.filter(d => d.numeroTramite > 0).length
    const porcentajeDiasConIngresos = (diasConIngresos / report.data.length) * 100
    
    return {
      maxTramites,
      minTramites,
      diasConIngresos,
      porcentajeDiasConIngresos: Math.round(porcentajeDiasConIngresos)
    }
  }, [report])

  // ----------------------------------------------------
  // GUARDIA DE RENDERIZADO TEMPRANO
  // ----------------------------------------------------
  if (loading) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Cargando gráfico de ingresos...</p>
          </div>
        </div>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="text-red-500 text-4xl mb-4">⚠️</div>
            <h3 className="text-lg font-semibold text-red-600 mb-2">Error al cargar datos</h3>
            <p className="text-gray-600">{error}</p>
          </div>
        </div>
      </Card>
    )
  }

  if (!report || !report.data || report.data.length === 0) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="flex items-center justify-center h-96">
          <div className="text-4xl mb-4">📊</div>
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Sin datos</h3>
          <p className="text-gray-500">No hay datos de ingresos para mostrar</p>
        </div>
      </Card>
    )
  }
  // ----------------------------------------------------

  // Opciones de período
  const periodOptions = [
    { value: 15, label: '15 días' },
    { value: 30, label: '30 días' },
    { value: 45, label: '45 días' },
    { value: 60, label: '60 días' },
    { value: 90, label: '90 días' }
  ]

  const handlePeriodChange = (newPeriod: number) => {
    setSelectedPeriod(newPeriod)
    onPeriodChange?.(newPeriod)
  }

  // Tooltip personalizado
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-sm">
          <p className="font-medium text-gray-800 mb-1">
            {formatDateSafe(data.fecha, { 
              weekday: 'long',
              day: '2-digit', 
              month: 'long'
            })}
          </p>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span className="text-gray-600">Trámites:</span>
              <span className="font-semibold text-blue-600">{data.numeroTramite}</span>
            </div>
            {data.tendencia && (
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-400 rounded-full"></div>
                <span className="text-gray-600">Tendencia:</span>
                <span className="font-semibold text-red-500">{data.tendencia.toFixed(1)}</span>
              </div>
            )}
          </div>
        </div>
      )
    }
    return null
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Gráfico principal diario */}
      <Card className="overflow-hidden">
        {/* Header con controles */}
        <div className="p-6 bg-gray-50 border-b">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-1">
                Ingreso Diario de Expedientes - {report.process.toUpperCase()}
              </h3>
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <span>{report.periodo}</span>
                <span>•</span>
                <span>{report.fechaInicio} al {report.fechaFin}</span>
              </div>
            </div>
            
            {/* Selector de período */}
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Período:</label>
              <select 
                value={selectedPeriod}
                onChange={(e) => handlePeriodChange(Number(e.target.value))}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {periodOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Estadísticas rápidas */}
          {stats && (
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{report.totalTramites}</div>
                <div className="text-xs text-gray-500">Total Trámites</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{report.promedioTramitesPorDia}</div>
                <div className="text-xs text-gray-500">Promedio/Día</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{stats.maxTramites}</div>
                <div className="text-xs text-gray-500">Máximo/Día</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{stats.porcentajeDiasConIngresos}%</div>
                <div className="text-xs text-gray-500">Días con Ingresos</div>
              </div>
            </div>
          )}
        </div>

        {/* Gráfico */}
        <div className="p-2 sm:p-6">
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={chartData}
                margin={{
                  top: 20,
                  right: 20,
                  left: 5,
                  bottom: 50
                }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="fechaLabel"
                  angle={-45}
                  textAnchor="end"
                  height={60}
                  tick={{ fontSize: 10 }}
                  stroke="#666"
                  interval={'preserveStartEnd'}
                  className="hidden sm:block"
                />
                 <XAxis 
                  dataKey="fechaLabel"
                  tick={{ fontSize: 9 }}
                  stroke="#666"
                  interval={3}
                  className="block sm:hidden"
                  />
                <YAxis 
                  stroke="#666"
                  tick={{ fontSize: 10 }}
                  width={30}
                  tickFormatter={(value) => value.toString()}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend 
                  wrapperStyle={{ paddingTop: '20px' }}
                  iconType="line"
                />
                
                {/* Línea principal de número de trámites */}
                <Line 
                  type="monotone" 
                  dataKey="numeroTramite" 
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ r: 4, fill: '#3b82f6' }}
                  activeDot={{ r: 6, fill: '#1d4ed8' }}
                  name="NumeroTramite"
                />
                
                {/* Línea de tendencia */}
                {chartData.some(d => d.tendencia !== undefined) && (
                  <Line 
                    type="monotone" 
                    dataKey="tendencia" 
                    stroke="#ef4444"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={false}
                    name="Tendencia"
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Footer con información adicional */}
        <div className="px-6 py-4 bg-gray-50 border-t">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-sm text-gray-600">
            <div>
              <strong>Días con datos:</strong> {report.diasConDatos} de {report.data.length}
            </div>
            <div>
              <strong>Proceso:</strong> {report.process.toUpperCase()}
            </div>
          </div>
        </div>
      </Card>

      {/* Tabla y gráfico mensual */}
      <MonthlyIngresosTable 
        data={report.monthlyData}
        loading={loading}
      />

      {/* Tabla y gráfico semanal */}
      <WeeklyIngresosTable 
        data={report.weeklyData}
        loading={loading}
      />
    </div>
  )
} 