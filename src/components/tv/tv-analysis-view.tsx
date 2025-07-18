'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { usePendientesReport } from '@/hooks/use-pendientes-report'
import { useProduccionReport } from '@/hooks/use-produccion-report'
import { useIngresos } from '@/hooks/use-ingresos'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'
import { TrendingUp, TrendingDown, Activity, Zap } from 'lucide-react'

interface TvAnalysisViewProps {
  process: string
}

const COLORS = ['#3b82f6', '#10b981', '#f97316', '#ef4444', '#8b5cf6', '#eab308']

export function TvAnalysisView({ process }: TvAnalysisViewProps) {
  const { report: pendientesReport, loading: pendientesLoading } = usePendientesReport({ 
    process: process as 'ccm' | 'prr' 
  })
  const { report: produccionReport, loading: produccionLoading } = useProduccionReport({ 
    process: process as 'ccm' | 'prr' 
  })
  const { report: ingresosReport, isLoading: ingresosLoading } = useIngresos({ 
    process: process as 'ccm' | 'prr',
    days: 30
  })

  const isLoading = pendientesLoading || produccionLoading || ingresosLoading

  if (isLoading) {
    return (
      <div className="min-h-screen p-8 flex items-center justify-center">
        <div className="text-white text-2xl">Cargando análisis de datos...</div>
      </div>
    )
  }

  const totalPendientes = pendientesReport?.grandTotal || 0
  const totalProduccion = produccionReport?.grandTotal || 0
  const totalIngresos = ingresosReport?.data?.reduce((sum, item) => sum + item.numeroTramite, 0) || 0

  // Análisis por años (top 5)
  const yearAnalysis = pendientesReport?.years?.slice(0, 5).map(year => {
    const pendientesAno = pendientesReport.totalByYear[year] || 0
    return {
      name: `Año ${year}`,
      value: pendientesAno,
      porcentaje: Math.round((pendientesAno / totalPendientes) * 100)
    }
  }) || []

  // Métricas de eficiencia
  const eficiencia = totalPendientes > 0 ? (totalProduccion / (totalProduccion + totalPendientes)) * 100 : 0
  const velocidadProcesamiento = Math.round(totalProduccion / 20) // Últimos 20 días
  const balanceIngresosProduccion = totalIngresos - totalProduccion
  const tendenciaBalance = balanceIngresosProduccion > 0 ? 'increasing' : 'decreasing'

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-white text-4xl font-bold mb-4">
            Análisis de Rendimiento - {process.toUpperCase()}
          </h1>
          <div className="text-white/70 text-xl">
            Métricas de Eficiencia y Distribución
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Distribución por Años */}
          <div className="tv-safe-bg rounded-2xl p-8">
            <h3 className="text-white text-2xl font-bold mb-6 text-center">
              Distribución de Pendientes por Año
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={yearAnalysis}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, porcentaje }) => `${name}: ${porcentaje}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {yearAnalysis.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'rgba(30, 41, 59, 0.95)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '8px',
                    color: '#e2e8f0'
                  }}
                />
                <Legend
                  wrapperStyle={{ color: '#e2e8f0', fontSize: '14px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Métricas de Rendimiento */}
          <div className="space-y-6">
            <div className="tv-safe-bg rounded-xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-white/70 text-lg mb-2">Eficiencia General</div>
                  <div className="text-white text-4xl font-bold">{eficiencia.toFixed(1)}%</div>
                </div>
                <div className="w-16 h-16 bg-blue-500 rounded-xl flex items-center justify-center">
                  <Zap className="w-8 h-8 text-white" />
                </div>
              </div>
            </div>

            <div className="tv-safe-bg rounded-xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-white/70 text-lg mb-2">Velocidad Procesamiento</div>
                  <div className="text-white text-4xl font-bold">{velocidadProcesamiento}</div>
                  <div className="text-white/60 text-sm">expedientes/día</div>
                </div>
                <div className="w-16 h-16 bg-green-500 rounded-xl flex items-center justify-center">
                  <Activity className="w-8 h-8 text-white" />
                </div>
              </div>
            </div>

            <div className="tv-safe-bg rounded-xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-white/70 text-lg mb-2">Balance Ingresos vs Producción</div>
                  <div className={`text-4xl font-bold ${
                    balanceIngresosProduccion > 0 ? 'text-red-400' : 'text-green-400'
                  }`}>
                    {balanceIngresosProduccion > 0 ? '+' : ''}{balanceIngresosProduccion}
                  </div>
                  <div className="text-white/60 text-sm">
                    {balanceIngresosProduccion > 0 ? 'Más ingresos que producción' : 'Más producción que ingresos'}
                  </div>
                </div>
                <div className={`w-16 h-16 rounded-xl flex items-center justify-center ${
                  balanceIngresosProduccion > 0 ? 'bg-red-500' : 'bg-green-500'
                }`}>
                  {balanceIngresosProduccion > 0 ? (
                    <TrendingUp className="w-8 h-8 text-white" />
                  ) : (
                    <TrendingDown className="w-8 h-8 text-white" />
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Resumen de métricas principales */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="tv-safe-bg rounded-xl p-6 text-center">
            <div className="text-white/70 text-lg mb-2">Total Pendientes</div>
            <div className="text-white text-3xl font-bold">{totalPendientes.toLocaleString()}</div>
          </div>
          <div className="tv-safe-bg rounded-xl p-6 text-center">
            <div className="text-white/70 text-lg mb-2">Total Producción</div>
            <div className="text-white text-3xl font-bold">{totalProduccion.toLocaleString()}</div>
          </div>
          <div className="tv-safe-bg rounded-xl p-6 text-center">
            <div className="text-white/70 text-lg mb-2">Total Ingresos (30d)</div>
            <div className="text-white text-3xl font-bold">{totalIngresos.toLocaleString()}</div>
          </div>
        </div>
      </div>
    </div>
  )
} 