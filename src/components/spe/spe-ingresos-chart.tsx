'use client'

import { useState, useMemo } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { Card } from '@/components/ui/card'
import type { IngresosReport } from '@/types/dashboard'
import { formatDateSafe } from '@/lib/date-utils'
import { MonthlyIngresosTable } from '@/components/ui/monthly-ingresos-table'
import { WeeklyIngresosTable } from '@/components/ui/weekly-ingresos-table'
import { SectionCard } from '@/components/ui/section-card'
import { SectionHeader } from '@/components/ui/section-header'
import { FilterSelect } from '@/components/ui/filter-select'
import { FileStack, Calendar } from 'lucide-react'

interface SpeIngresosChartProps {
  report: IngresosReport | null
  loading?: boolean
  error?: string | null
  className?: string
  onPeriodChange?: (days: number) => void
}

export function SpeIngresosChart({ 
  report, 
  loading = false, 
  error = null, 
  className = '',
  onPeriodChange 
}: SpeIngresosChartProps) {
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
    <SectionCard className={className}>
      <SectionHeader
        icon={<FileStack className="h-6 w-6 text-indigo-600" />}
        title="Ingreso Diario de Expedientes - SPE"
        description={`${report.periodo} • ${report.fechaInicio} al ${report.fechaFin}`}
        actions={
          <FilterSelect
            value={selectedPeriod}
            onChange={(e) => handlePeriodChange(Number(e.target.value))}
            icon={<Calendar className="h-4 w-4" />}
            containerClassName="w-full sm:w-48"
          >
            {periodOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </FilterSelect>
        }
      />

      <div className="space-y-6 mt-6">
        <Card className="overflow-hidden bg-white">
          <div className="p-2 sm:p-6 h-96">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 20, right: 20, left: 5, bottom: 50 }}>
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
        </Card>

        {/* Tablas secundarias */}
        <MonthlyIngresosTable data={report.monthlyData} loading={loading} />
        <WeeklyIngresosTable data={report.weeklyData} loading={loading} />
      </div>
    </SectionCard>
  )
} 