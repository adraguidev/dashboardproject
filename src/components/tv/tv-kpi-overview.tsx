'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { usePendientesReport } from '@/hooks/use-pendientes-report'
import { useProduccionReport } from '@/hooks/use-produccion-report'
import { useIngresos } from '@/hooks/use-ingresos'
import { useSpeData } from '@/hooks/use-spe-data'
import { useSpeIngresos } from '@/hooks/use-spe-ingresos'
import { useSpeProduccion } from '@/hooks/use-spe-produccion'
import { useSolData } from '@/hooks/use-sol-data'
import { useSolIngresos } from '@/hooks/use-sol-ingresos'
import { useSolProduccion } from '@/hooks/use-sol-produccion'
import { Card } from '@/components/ui/card'
import { BarChart3, TrendingUp, TrendingDown, Clock, Users, CheckCircle, AlertCircle } from 'lucide-react'

interface TvKpiOverviewProps {
  process: string
}

interface KpiCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon: React.ComponentType<any>
  color: string
  trend?: {
    value: number
    isPositive: boolean
  }
  loading?: boolean
}

function TvKpiCard({ title, value, subtitle, icon: Icon, color, trend, loading }: KpiCardProps) {
  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="tv-safe-bg rounded-2xl p-8 h-52"
      >
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-white/20 rounded w-3/4"></div>
          <div className="h-12 bg-white/20 rounded w-1/2"></div>
          <div className="h-4 bg-white/20 rounded w-2/3"></div>
        </div>
      </motion.div>
    )
  }

  // Formatear números grandes
  const formatValue = (val: string | number) => {
    if (typeof val === 'string') return val
    if (val >= 1000000) return (val / 1000000).toFixed(1) + 'M'
    if (val >= 1000) return (val / 1000).toFixed(1) + 'K'
    return val.toString()
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.3 }}
      className="tv-safe-bg rounded-2xl p-6 relative overflow-hidden h-52 flex flex-col"
    >
      {/* Background decoration */}
      <div className={`absolute top-0 right-0 w-24 h-24 ${color} opacity-10 rounded-full -mr-8 -mt-8`}></div>
      
      <div className="relative z-10 h-full flex flex-col justify-between">
        <div className="flex items-center justify-between mb-4">
          <div className={`w-12 h-12 ${color} rounded-xl flex items-center justify-center text-white`}>
            <Icon className="w-6 h-6" />
          </div>
          {trend && (
            <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
              trend.isPositive 
                ? 'bg-green-500/20 text-green-400' 
                : 'bg-red-500/20 text-red-400'
            }`}>
              {trend.isPositive ? (
                <TrendingUp className="w-3 h-3" />
              ) : (
                <TrendingDown className="w-3 h-3" />
              )}
              {Math.abs(trend.value)}%
            </div>
          )}
        </div>
        
        <div className="flex-1 flex flex-col justify-center">
          <h3 className="text-white/80 text-base font-medium mb-2 leading-tight">{title}</h3>
          <div className="text-white font-bold mb-1 leading-tight" style={{ fontSize: 'clamp(1.5rem, 4vw, 2.5rem)' }}>
            {formatValue(value)}
          </div>
          {subtitle && <div className="text-white/60 text-xs leading-tight">{subtitle}</div>}
        </div>
      </div>
    </motion.div>
  )
}

export function TvKpiOverview({ process }: TvKpiOverviewProps) {
  // Hooks para CCM/PRR
  const { report: pendientesReport, loading: pendientesLoading } = usePendientesReport({ 
    process: process as 'ccm' | 'prr',
    enabled: process === 'ccm' || process === 'prr'
  })
  const { report: produccionReport, loading: produccionLoading } = useProduccionReport({ 
    process: process as 'ccm' | 'prr',
    days: 5,
    enabled: process === 'ccm' || process === 'prr'
  })
  const { report: ingresosReport, isLoading: ingresosLoading } = useIngresos({ 
    process: process as 'ccm' | 'prr',
    enabled: process === 'ccm' || process === 'prr'
  })

  // Hooks para SPE
  const { data: speData, isLoading: speDataLoading } = useSpeData()
  const { report: speIngresosReport, isLoading: speIngresosLoading } = useSpeIngresos()
  const { data: speProduccionData, isLoading: speProduccionLoading } = useSpeProduccion()

  // Hooks para SOL
  const { data: solData, isLoading: solDataLoading } = useSolData()
  const { report: solIngresosReport, isLoading: solIngresosLoading } = useSolIngresos()
  const { data: solProduccionData, isLoading: solProduccionLoading } = useSolProduccion()

  // Determinar loading state según proceso
  const isLoading = process === 'spe' 
    ? (speDataLoading || speIngresosLoading || speProduccionLoading)
    : process === 'sol'
    ? (solDataLoading || solIngresosLoading || solProduccionLoading)
    : (pendientesLoading || produccionLoading || ingresosLoading)

  // Calcular KPIs según el proceso
  let totalPendientes = 0
  let totalOperadores = 0
  let produccionTotal = 0
  let produccionPromedio = 0
  let ingresosRecientes = 0
  let ingresosPromedioSemanal = 0

  if (process === 'spe') {
    totalPendientes = speData?.data?.reduce((sum, item) => sum + item.totalGeneral, 0) || 0
    totalOperadores = speData?.data?.length || 0
    produccionTotal = speProduccionData?.data?.reduce((sum, item) => sum + item.totalGeneral, 0) || 0
    produccionPromedio = Math.round(produccionTotal / 5) // Últimos 5 días
    ingresosRecientes = speIngresosReport?.data?.slice(-7).reduce((sum, item) => sum + item.numeroTramite, 0) || 0
    ingresosPromedioSemanal = Math.round(ingresosRecientes / 7)
  } else if (process === 'sol') {
    totalPendientes = solData?.data?.reduce((sum, item) => sum + item.totalGeneral, 0) || 0
    totalOperadores = solData?.data?.length || 0
    produccionTotal = solProduccionData?.data?.reduce((sum, item) => sum + item.totalGeneral, 0) || 0
    produccionPromedio = Math.round(produccionTotal / 5) // Últimos 5 días
    ingresosRecientes = solIngresosReport?.data?.slice(-7).reduce((sum, item) => sum + item.numeroTramite, 0) || 0
    ingresosPromedioSemanal = Math.round(ingresosRecientes / 7)
  } else {
    // CCM/PRR
    totalPendientes = pendientesReport?.grandTotal || 0
    totalOperadores = pendientesReport?.data?.length || 0
    produccionTotal = produccionReport?.grandTotal || 0
    produccionPromedio = Math.round(produccionTotal / 5) // Últimos 5 días
    ingresosRecientes = ingresosReport?.data?.slice(-7).reduce((sum: number, item: any) => sum + item.numeroTramite, 0) || 0
    ingresosPromedioSemanal = Math.round(ingresosRecientes / 7)
  }

  // Tendencias (simuladas - podrías calcular las reales comparando períodos)
  const pendientesTrend = { value: 5.2, isPositive: false } // Reducción es positiva
  const produccionTrend = { value: 12.8, isPositive: true }
  const ingresosTrend = { value: 3.4, isPositive: true }

  const processName = {
    'ccm': 'Cambio de Calidad Migratoria',
    'prr': 'Prórroga de Residencia', 
    'spe': 'Servicios por Exclusividad',
    'sol': 'Solicitud de Visas'
  }[process] || process.toUpperCase()

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-white text-5xl font-bold mb-4">
            Dashboard {process.toUpperCase()}
          </h1>
          <p className="text-white/70 text-xl">
            {processName} - Indicadores en Tiempo Real
          </p>
          <div className="mt-4 flex items-center justify-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-white/80">Datos actualizados</span>
            <span className="text-white/60">
              {new Date().toLocaleTimeString('es-PE', { 
                hour: '2-digit', 
                minute: '2-digit',
                timeZone: 'America/Lima'
              })}
            </span>
          </div>
        </motion.div>

        {/* KPI Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 mb-12">
          <TvKpiCard
            title="Expedientes Pendientes"
            value={totalPendientes.toLocaleString()}
            subtitle="Total por procesar"
            icon={BarChart3}
            color="bg-blue-500"
            trend={pendientesTrend}
            loading={isLoading}
          />
          
          <TvKpiCard
            title="Operadores Activos"
            value={totalOperadores}
            subtitle="Con expedientes asignados"
            icon={Users}
            color="bg-purple-500"
            loading={isLoading}
          />
          
          <TvKpiCard
            title="Producción Total"
            value={produccionTotal.toLocaleString()}
            subtitle="Últimos 5 días"
            icon={CheckCircle}
            color="bg-green-500"
            trend={produccionTrend}
            loading={isLoading}
          />
          
          <TvKpiCard
            title="Promedio Diario"
            value={Math.round(produccionPromedio)}
            subtitle="Expedientes procesados"
            icon={TrendingUp}
            color="bg-orange-500"
            loading={isLoading}
          />
          
          <TvKpiCard
            title="Ingresos (7 días)"
            value={ingresosRecientes.toLocaleString()}
            subtitle="Nuevos expedientes"
            icon={Clock}
            color="bg-cyan-500"
            trend={ingresosTrend}
            loading={isLoading}
          />
          
          <TvKpiCard
            title="Promedio Semanal"
            value={ingresosPromedioSemanal}
            subtitle="Ingresos por día"
            icon={TrendingUp}
            color="bg-indigo-500"
            loading={isLoading}
          />
          
          <TvKpiCard
            title="Eficiencia"
            value={produccionTotal > 0 ? `${Math.round((produccionTotal / (produccionTotal + totalPendientes)) * 100)}%` : '0%'}
            subtitle="Ratio procesamiento"
            icon={AlertCircle}
            color="bg-emerald-500"
            loading={isLoading}
          />
          
          <TvKpiCard
            title="Balance"
            value={ingresosRecientes - produccionTotal}
            subtitle="Ingresos vs Producción"
            icon={BarChart3}
            color={ingresosRecientes > produccionTotal ? 'bg-red-500' : 'bg-green-500'}
            loading={isLoading}
          />
        </div>

        {/* Footer with timestamp */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center text-white/50 text-sm"
        >
          <p>Sistema de monitoreo UFSM - Última actualización: {new Date().toLocaleString('es-PE')}</p>
        </motion.div>
      </div>
    </div>
  )
} 