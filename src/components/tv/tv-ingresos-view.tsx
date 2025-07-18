'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { useIngresos } from '@/hooks/use-ingresos'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts'
import { formatDateSafe } from '@/lib/date-utils'

interface TvIngresosViewProps {
  process: string
}

export function TvIngresosView({ process }: TvIngresosViewProps) {
  const { report, isLoading } = useIngresos({ 
    process: process as 'ccm' | 'prr',
    days: 30
  })

  if (isLoading) {
    return (
      <div className="min-h-screen p-8 flex items-center justify-center">
        <div className="text-white text-2xl">Cargando datos de ingresos...</div>
      </div>
    )
  }

  const chartData = report?.data?.map(item => ({
    fecha: formatDateSafe(item.fecha, { day: '2-digit', month: '2-digit' }),
    cantidad: item.numeroTramite,
    fechaCompleta: formatDateSafe(item.fecha, { day: '2-digit', month: 'short', year: 'numeric' })
  })) || []

  const totalIngresos = chartData.reduce((sum, item) => sum + item.cantidad, 0)
  const promedioIngresos = Math.round(totalIngresos / chartData.length)
  const maxIngresos = Math.max(...chartData.map(item => item.cantidad))
  const ultimaSemana = chartData.slice(-7).reduce((sum, item) => sum + item.cantidad, 0)

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-white text-4xl font-bold mb-4">
            Ingresos de Expedientes - {process.toUpperCase()}
          </h1>
          <div className="text-white/70 text-xl">
            Tendencia de Ingresos - Últimos 30 Días
          </div>
        </motion.div>

        <div className="tv-safe-bg rounded-2xl p-8 h-96 mb-8">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorIngresos" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis 
                dataKey="fecha" 
                stroke="#e2e8f0"
                fontSize={12}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis 
                stroke="#e2e8f0"
                fontSize={14}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'rgba(30, 41, 59, 0.95)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '8px',
                  color: '#e2e8f0'
                }}
                labelFormatter={(value, payload) => {
                  if (payload && payload[0]) {
                    return `Fecha: ${payload[0].payload.fechaCompleta}`
                  }
                  return value
                }}
              />
              <Area 
                type="monotone" 
                dataKey="cantidad" 
                stroke="#3b82f6" 
                fillOpacity={1} 
                fill="url(#colorIngresos)"
                strokeWidth={3}
              />
              <Line 
                type="monotone" 
                dataKey="cantidad" 
                stroke="#3b82f6" 
                strokeWidth={3}
                dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, stroke: '#3b82f6', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="tv-safe-bg rounded-xl p-6 text-center">
            <div className="text-white/70 text-sm mb-2">Total Período</div>
            <div className="text-white text-3xl font-bold">{totalIngresos.toLocaleString()}</div>
          </div>
          <div className="tv-safe-bg rounded-xl p-6 text-center">
            <div className="text-white/70 text-sm mb-2">Promedio Diario</div>
            <div className="text-white text-3xl font-bold">{promedioIngresos}</div>
          </div>
          <div className="tv-safe-bg rounded-xl p-6 text-center">
            <div className="text-white/70 text-sm mb-2">Máximo Día</div>
            <div className="text-white text-3xl font-bold">{maxIngresos}</div>
          </div>
          <div className="tv-safe-bg rounded-xl p-6 text-center">
            <div className="text-white/70 text-sm mb-2">Última Semana</div>
            <div className="text-white text-3xl font-bold">{ultimaSemana}</div>
          </div>
        </div>
      </div>
    </div>
  )
} 