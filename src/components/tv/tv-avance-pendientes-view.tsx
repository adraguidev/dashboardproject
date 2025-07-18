'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { useAvancePendientes } from '@/hooks/use-avance-pendientes'
import { useSpeAvancePendientes } from '@/hooks/use-spe-avance-pendientes'
import { useSolAvancePendientes } from '@/hooks/use-sol-avance-pendientes'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

interface TvAvancePendientesViewProps {
  process: string
}

export function TvAvancePendientesView({ process }: TvAvancePendientesViewProps) {
  // Determinar qué hook usar según el proceso
  const { data: ccmPrrData, isLoading: ccmPrrLoading } = useAvancePendientes(
    process.toUpperCase() as 'CCM' | 'PRR'
  )
  
  const { data: speData, isLoading: speLoading } = useSpeAvancePendientes()
  const { data: solData, isLoading: solLoading } = useSolAvancePendientes()

  // Seleccionar datos según el proceso
  const data = process === 'spe' ? speData : process === 'sol' ? solData : ccmPrrData
  const isLoading = process === 'spe' ? speLoading : process === 'sol' ? solLoading : ccmPrrLoading

  if (isLoading) {
    return (
      <div className="min-h-screen p-8 flex items-center justify-center">
        <div className="text-white text-2xl">Cargando avance de pendientes...</div>
      </div>
    )
  }

  if (!data?.success || !data.data) {
    return (
      <div className="min-h-screen p-8 flex items-center justify-center">
        <div className="text-white text-xl">No hay datos de avance disponibles</div>
      </div>
    )
  }

  const { fechas, operadores } = data.data

  // Procesar datos para los últimos 30 días
  const fechasOrdenadas = fechas
    .map(fecha => ({
      original: fecha,
      parsed: parseISO(fecha + 'T12:00:00'),
      formatted: format(parseISO(fecha + 'T12:00:00'), 'dd/MM', { locale: es })
    }))
    .sort((a, b) => a.parsed.getTime() - b.parsed.getTime())
    .slice(-30) // Últimos 30 días

  // Calcular totales por día
  const totalesPorDia = fechasOrdenadas.map(fecha => {
    const total = operadores.reduce((sum, op) => {
      const valor = op[fecha.original] as number || 0
      return sum + valor
    }, 0)
    return {
      fecha: fecha.formatted,
      total: total,
      fechaCompleta: format(fecha.parsed, 'dd MMM yyyy', { locale: es })
    }
  })

  // Top 5 operadores con más pendientes en la última fecha
  const ultimaFecha = fechasOrdenadas[fechasOrdenadas.length - 1]?.original
  const topOperadores = ultimaFecha ? operadores
    .map(op => ({
      operador: op.operador,
      pendientes: op[ultimaFecha] as number || 0
    }))
    .filter(op => op.pendientes > 0)
    .sort((a, b) => b.pendientes - a.pendientes)
    .slice(0, 5) : []

  const totalActual = totalesPorDia[totalesPorDia.length - 1]?.total || 0
  const totalAnterior = totalesPorDia[totalesPorDia.length - 2]?.total || 0
  const variacion = totalAnterior > 0 ? ((totalActual - totalAnterior) / totalAnterior * 100) : 0

  const processName = {
    'ccm': 'Cambio de Calidad Migratoria',
    'prr': 'Prórroga de Residencia', 
    'spe': 'Servicios por Exclusividad',
    'sol': 'Solicitud de Visas'
  }[process] || process.toUpperCase()

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-white text-4xl font-bold mb-4">
            Avance de Pendientes - {process.toUpperCase()}
          </h1>
          <div className="text-white/70 text-xl">
            {processName} - Evolución Últimos 30 Días
          </div>
        </motion.div>

        {/* Gráfico de Evolución */}
        <div className="tv-safe-bg rounded-2xl p-8 mb-8">
          <h3 className="text-white text-xl font-bold mb-6 text-center">
            Evolución de Pendientes Totales
          </h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={totalesPorDia}>
                <defs>
                  <linearGradient id="colorPendientes" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
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
                  dataKey="total" 
                  stroke="#f97316" 
                  fillOpacity={1} 
                  fill="url(#colorPendientes)"
                  strokeWidth={3}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Métricas y Top Operadores */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Métricas Principales */}
          <div className="space-y-6">
            <div className="tv-safe-bg rounded-xl p-6 text-center">
              <div className="text-white/70 text-lg mb-2">Total Actual</div>
              <div className="text-white text-4xl font-bold">{totalActual.toLocaleString()}</div>
              <div className={`text-sm font-medium ${
                variacion > 0 ? 'text-red-400' : variacion < 0 ? 'text-green-400' : 'text-white/60'
              }`}>
                {variacion > 0 ? '+' : ''}{variacion.toFixed(1)}% vs día anterior
              </div>
            </div>
            
            <div className="tv-safe-bg rounded-xl p-6 text-center">
              <div className="text-white/70 text-lg mb-2">Operadores Activos</div>
              <div className="text-white text-4xl font-bold">{topOperadores.length}</div>
              <div className="text-white/60 text-sm">con pendientes asignados</div>
            </div>

            <div className="tv-safe-bg rounded-xl p-6 text-center">
              <div className="text-white/70 text-lg mb-2">Promedio por Operador</div>
              <div className="text-white text-4xl font-bold">
                {topOperadores.length > 0 ? Math.round(totalActual / topOperadores.length) : 0}
              </div>
              <div className="text-white/60 text-sm">expedientes pendientes</div>
            </div>
          </div>

          {/* Top 5 Operadores */}
          <div className="tv-safe-bg rounded-xl p-6">
            <h3 className="text-white text-xl font-bold mb-6 text-center">
              Top 5 Operadores (Actual)
            </h3>
            <div className="space-y-4">
              {topOperadores.map((operator, index) => (
                <div key={operator.operador} className="flex items-center justify-between p-3 bg-white/10 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm ${
                      index === 0 ? 'bg-yellow-500' : 
                      index === 1 ? 'bg-gray-400' : 
                      index === 2 ? 'bg-orange-600' : 'bg-blue-500'
                    }`}>
                      {index + 1}
                    </div>
                    <div className="text-white font-medium leading-tight">
                      {operator.operador.length > 25 ? 
                        operator.operador.substring(0, 25) + '...' : 
                        operator.operador
                      }
                    </div>
                  </div>
                  <div className="text-white font-bold text-lg">
                    {operator.pendientes.toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 