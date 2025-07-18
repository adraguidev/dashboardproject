'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { useProduccionReport } from '@/hooks/use-produccion-report'
import { useSpeProduccion } from '@/hooks/use-spe-produccion'
import { useSolProduccion } from '@/hooks/use-sol-produccion'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { formatDateSafe } from '@/lib/date-utils'

interface TvProduccionViewProps {
  process: string
}

export function TvProduccionView({ process }: TvProduccionViewProps) {
  // Hooks para CCM/PRR
  const { report, loading } = useProduccionReport({ 
    process: process as 'ccm' | 'prr',
    days: 5, // Últimos 5 días en lugar de 20
    enabled: process === 'ccm' || process === 'prr'
  })

  // Hooks para SPE/SOL
  const { data: speData, isLoading: speLoading } = useSpeProduccion()
  const { data: solData, isLoading: solLoading } = useSolProduccion()

  const isLoading = process === 'spe' ? speLoading : 
                   process === 'sol' ? solLoading : loading

  if (isLoading) {
    return (
      <div className="min-h-screen p-8 flex items-center justify-center">
        <div className="text-white text-2xl">Cargando datos de producción...</div>
      </div>
    )
  }

  // Procesar datos según el proceso
  let topProducers: Array<{operador: string, total: number}> = []
  let totalProduccion = 0
  let totalOperadores = 0

  if (process === 'spe') {
    const data = speData?.data || []
    totalProduccion = data.reduce((sum, item) => sum + item.totalGeneral, 0)
    totalOperadores = data.length
    topProducers = data
      .slice()
      .sort((a, b) => b.totalGeneral - a.totalGeneral)
      .slice(0, 10)
      .map(item => ({
        operador: item.evaluador.length > 15 ? item.evaluador.substring(0, 15) + '...' : item.evaluador,
        total: item.totalGeneral
      }))
  } else if (process === 'sol') {
    const data = solData?.data || []
    totalProduccion = data.reduce((sum, item) => sum + item.totalGeneral, 0)
    totalOperadores = data.length
    topProducers = data
      .slice()
      .sort((a, b) => b.totalGeneral - a.totalGeneral)
      .slice(0, 10)
      .map(item => ({
        operador: item.evaluador.length > 15 ? item.evaluador.substring(0, 15) + '...' : item.evaluador,
        total: item.totalGeneral
      }))
  } else {
    // CCM/PRR
    totalProduccion = report?.grandTotal || 0
    totalOperadores = report?.data?.length || 0
    topProducers = report?.data
      ?.slice()
      .sort((a, b) => b.total - a.total)
      .slice(0, 10)
      .map(item => ({
        operador: item.operador.length > 15 ? item.operador.substring(0, 15) + '...' : item.operador,
        total: item.total
      })) || []
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-white text-4xl font-bold mb-4">
            Producción de Expedientes - {process.toUpperCase()}
          </h1>
          <div className="text-white/70 text-xl">
            Top 10 Operadores Más Productivos
          </div>
        </motion.div>

        <div className="tv-safe-bg rounded-2xl p-8 h-96 mb-8">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={topProducers}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis 
                dataKey="operador" 
                stroke="#e2e8f0"
                fontSize={14}
                angle={-45}
                textAnchor="end"
                height={80}
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
              />
              <Bar 
                dataKey="total" 
                fill="#10b981"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="tv-safe-bg rounded-xl p-6 text-center">
            <div className="text-white/70 text-sm mb-2">Total Producción</div>
            <div className="text-white text-3xl font-bold">{totalProduccion.toLocaleString()}</div>
          </div>
          <div className="tv-safe-bg rounded-xl p-6 text-center">
            <div className="text-white/70 text-sm mb-2">Operadores Activos</div>
            <div className="text-white text-3xl font-bold">{totalOperadores}</div>
          </div>
          <div className="tv-safe-bg rounded-xl p-6 text-center">
            <div className="text-white/70 text-sm mb-2">Promedio por Operador</div>
            <div className="text-white text-3xl font-bold">
              {Math.round(totalProduccion / (totalOperadores || 1))}
            </div>
          </div>
          <div className="tv-safe-bg rounded-xl p-6 text-center">
            <div className="text-white/70 text-sm mb-2">Período</div>
            <div className="text-white text-xl font-bold">5 días</div>
          </div>
        </div>
      </div>
    </div>
  )
} 