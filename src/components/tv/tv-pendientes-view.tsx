'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { usePendientesReport } from '@/hooks/use-pendientes-report'
import { useSpeData } from '@/hooks/use-spe-data'
import { useSolData } from '@/hooks/use-sol-data'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface TvPendientesViewProps {
  process: string
}

export function TvPendientesView({ process }: TvPendientesViewProps) {
  // Hooks para CCM/PRR
  const { report, loading } = usePendientesReport({ 
    process: process as 'ccm' | 'prr',
    enabled: process === 'ccm' || process === 'prr'
  })

  // Hooks para SPE/SOL
  const { data: speData, isLoading: speLoading } = useSpeData()
  const { data: solData, isLoading: solLoading } = useSolData()

  const isLoading = process === 'spe' ? speLoading : 
                   process === 'sol' ? solLoading : loading

  if (isLoading) {
    return (
      <div className="min-h-screen p-8 flex items-center justify-center">
        <div className="text-white text-2xl">Cargando datos de pendientes...</div>
      </div>
    )
  }

  // Procesar datos según el proceso
  let topOperators: Array<{rank: number, operador: string, total: number, percentage: string}> = []
  let totalPendientes = 0

  if (process === 'spe') {
    const data = speData?.data || []
    totalPendientes = data.reduce((sum, item) => sum + item.totalGeneral, 0)
    topOperators = data
      .slice(0, 10)
      .map((item, index) => ({
        rank: index + 1,
        operador: item.evaluador,
        total: item.totalGeneral,
        percentage: totalPendientes > 0 ? ((item.totalGeneral / totalPendientes) * 100).toFixed(1) : '0'
      }))
  } else if (process === 'sol') {
    const data = solData?.data || []
    totalPendientes = data.reduce((sum, item) => sum + item.totalGeneral, 0)
    topOperators = data
      .slice(0, 10)
      .map((item, index) => ({
        rank: index + 1,
        operador: item.evaluador,
        total: item.totalGeneral,
        percentage: totalPendientes > 0 ? ((item.totalGeneral / totalPendientes) * 100).toFixed(1) : '0'
      }))
  } else {
    // CCM/PRR
    totalPendientes = report?.grandTotal || 0
    topOperators = report?.data?.slice(0, 10).map((item, index) => ({
      rank: index + 1,
      operador: item.operador,
      total: item.total,
      percentage: report.grandTotal > 0 ? ((item.total / report.grandTotal) * 100).toFixed(1) : '0'
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
            Expedientes Pendientes - {process.toUpperCase()}
          </h1>
          <div className="text-white/70 text-xl">
            Top 10 Operadores con Mayor Carga de Trabajo
          </div>
        </motion.div>

        {/* Lista de Top Operadores */}
        <div className="tv-safe-bg rounded-2xl p-8 mb-8">
          <div className="space-y-4">
            {topOperators.map((operator, index) => (
              <motion.div
                key={operator.operador}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center justify-between p-4 bg-white/10 rounded-xl hover:bg-white/20 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg ${
                    index === 0 ? 'bg-yellow-500' : 
                    index === 1 ? 'bg-gray-400' : 
                    index === 2 ? 'bg-orange-600' : 'bg-blue-500'
                  }`}>
                    {operator.rank}
                  </div>
                  <div className="flex-1">
                    <div className="text-white font-semibold text-lg leading-tight">
                      {operator.operador.length > 40 ? 
                        operator.operador.substring(0, 40) + '...' : 
                        operator.operador
                      }
                    </div>
                    <div className="text-white/60 text-sm">
                      {operator.percentage}% del total
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-white font-bold text-2xl">
                    {operator.total.toLocaleString()}
                  </div>
                  <div className="text-white/60 text-sm">expedientes</div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-8">
          <div className="tv-safe-bg rounded-xl p-6 text-center">
            <div className="text-white/70 text-sm mb-2">Total Pendientes</div>
            <div className="text-white text-3xl font-bold">{totalPendientes.toLocaleString()}</div>
          </div>
          <div className="tv-safe-bg rounded-xl p-6 text-center">
            <div className="text-white/70 text-sm mb-2">Operadores</div>
            <div className="text-white text-3xl font-bold">{topOperators.length}</div>
          </div>
          <div className="tv-safe-bg rounded-xl p-6 text-center">
            <div className="text-white/70 text-sm mb-2">Promedio por Operador</div>
            <div className="text-white text-3xl font-bold">
              {Math.round(totalPendientes / (topOperators.length || 1))}
            </div>
          </div>
          <div className="tv-safe-bg rounded-xl p-6 text-center">
            <div className="text-white/70 text-sm mb-2">Proceso</div>
            <div className="text-white text-xl font-bold">{process.toUpperCase()}</div>
          </div>
        </div>
      </div>
    </div>
  )
} 