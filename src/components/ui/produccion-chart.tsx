'use client'

import React, { useMemo } from 'react'
import {
  ComposedChart,
  Area,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { Factory, BarChart3 } from 'lucide-react'
import {
  formatDateSafe,
  getDayOfWeekSafe,
  parseDateSafe,
} from '@/lib/date-utils'
import type { ProduccionReportSummary } from '@/types/dashboard'

interface ProduccionChartProps {
  report: ProduccionReportSummary | null
  loading?: boolean
  className?: string
}

const CustomTooltipEvolucion = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload
    return (
      <div className="rounded-lg border border-gray-200 bg-white/80 p-3 text-sm shadow-lg backdrop-blur-sm">
        <p className="mb-1 font-medium text-gray-800">{data.fechaCompleta}</p>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-green-500"></div>
            <span className="text-gray-600">Producción:</span>
            <span className="font-semibold text-green-600">
              {data.produccion.toLocaleString()}
            </span>
          </div>
        </div>
      </div>
    )
  }
  return null
}

const CustomTooltipPromedio = ({ active, payload, label }: any) => {
  if (!active || !payload || !payload.length) return null
  const data = payload[0].payload
  return (
    <div className="rounded-lg border border-gray-200 bg-white/80 p-3 text-sm shadow-lg backdrop-blur-sm">
      <p className="mb-2 font-semibold text-gray-900">Día: {label}</p>
      <div className="space-y-1">
        <div className="flex justify-between gap-4">
          <span className="text-gray-600">Promedio:</span>
          <span className="font-bold text-blue-600">
            {data.promedio.toLocaleString()}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Mediana:</span>
          <span className="font-medium text-green-600">
            {data.mediana.toLocaleString()}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Rango:</span>
          <span className="text-gray-500">
            {data.minimo} - {data.maximo}
          </span>
        </div>
        <div className="mt-2 flex justify-between border-t pt-1">
          <span className="text-gray-600">Días con datos:</span>
          <span className="font-medium text-purple-600">
            {data.diasTrabajados}
          </span>
        </div>
      </div>
    </div>
  )
}

function ProduccionChartComponent({
  report,
  loading = false,
  className = '',
}: ProduccionChartProps) {
  const chartData = useMemo(() => {
    if (!report || !report.fechas.length) return []
    return report.fechas
      .map((fecha) => {
        const count = report.totalByDate[fecha] || 0
        const day = getDayOfWeekSafe(fecha)
        const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

        return {
          fecha,
          fechaCompleta: formatDateSafe(fecha, {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          }),
          dia: dayNames[day],
          produccion: count,
          fechaDate: parseDateSafe(fecha) || new Date(),
        }
      })
      .filter((item) => item.produccion > 0)
      .sort((a, b) => a.fechaDate.getTime() - b.fechaDate.getTime())
  }, [report])

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
      .filter((day) => dayGroups[day])
      .map((day) => {
        const group = dayGroups[day]
        const promedio = group.total / group.count
        const sortedDias = [...group.dias].sort((a, b) => a - b)
        const mid = Math.floor(sortedDias.length / 2)
        const mediana =
          sortedDias.length % 2 !== 0
            ? sortedDias[mid]
            : (sortedDias[mid - 1] + sortedDias[mid]) / 2
        return {
          dia: day,
          promedio: Math.round(promedio),
          mediana: Math.round(mediana),
          minimo: Math.min(...group.dias),
          maximo: Math.max(...group.dias),
          diasTrabajados: group.count,
        }
      })
  }, [chartData])

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-1/4 rounded bg-gray-200 mb-6"></div>
          <div className="h-6 w-full rounded bg-gray-200"></div>
        </div>
      </div>
    )
  }

  if (!report || chartData.length === 0) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center text-gray-500">
          <Factory className="mx-auto h-8 w-8" />
          <p className="mt-2">No hay datos de producción para mostrar.</p>
        </div>
      </div>
    )
  }

  return (
    <div className={className}>
      {/* Primer Gráfico */}
      <div className="p-4">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
          <Factory className="h-5 w-5 mr-2 text-green-600" />
          Evolución de la Producción Diaria
        </h3>
        <div className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={chartData.map((d) => ({
                ...d,
                fecha: formatDateSafe(d.fecha, {
                  month: '2-digit',
                  day: '2-digit',
                }),
              }))}
              margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
            >
              <defs>
                <linearGradient id="colorProduccion" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#e0e0e0"
                vertical={false}
              />
              <XAxis
                dataKey="fecha"
                tick={{ fontSize: 11 }}
                angle={-25}
                textAnchor="end"
                height={50}
              />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip content={<CustomTooltipEvolucion />} />
              <Legend verticalAlign="top" height={36} />
              <Area
                type="monotone"
                dataKey="produccion"
                stroke="#10b981"
                strokeWidth={2}
                fill="url(#colorProduccion)"
                name="Producción"
                dot={{ r: 4, stroke: '#10b981', fill: '#fff', strokeWidth: 2 }}
                activeDot={{
                  r: 6,
                  stroke: '#10b981',
                  fill: '#fff',
                  strokeWidth: 2,
                }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Segundo Gráfico */}
      <div className="p-4 border-t border-gray-200">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
          <BarChart3 className="h-5 w-5 mr-2 text-indigo-600" />
          Análisis por Día de la Semana
        </h3>
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={averageData}
              margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#e0e0e0"
                vertical={false}
              />
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
              <Tooltip content={<CustomTooltipPromedio />} />
              <Legend verticalAlign="top" height={36} />
              <Bar
                dataKey="promedio"
                name="Producción Promedio"
                fill="#8884d8"
                radius={[4, 4, 0, 0]}
              />
              <Line
                type="monotone"
                name="Mediana"
                dataKey="mediana"
                stroke="#82ca9d"
                strokeWidth={2}
                dot={{ fill: '#82ca9d', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}

 
export const ProduccionChart = React.memo(
  ProduccionChartComponent
) as typeof ProduccionChartComponent 