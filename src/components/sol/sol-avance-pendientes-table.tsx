'use client'

import React, { useState, useRef } from 'react'
import { useSolAvancePendientes } from '@/hooks/use-sol-avance-pendientes'
import { SectionCard } from '@/components/ui/section-card'
import { SectionHeader } from '@/components/ui/section-header'
import { Activity, Download, RefreshCw, Camera, Users, Calendar } from 'lucide-react'
import { motion } from 'framer-motion'
import { formatDateShort, formatDateSafe } from '@/lib/date-utils'
import { Activity as ActivityIcon } from 'lucide-react'

interface SolAvancePendientesTableProps {
  className?: string
}

export default function SolAvancePendientesTable({ 
  className
}: SolAvancePendientesTableProps) {
  const { data, isLoading, error, refetch } = useSolAvancePendientes()
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isSnapshotLoading, setIsSnapshotLoading] = useState(false)
  const [periodoSeleccionado, setPeriodoSeleccionado] = useState<number>(30)
  const tableContainerRef = useRef<HTMLDivElement>(null)

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      await refetch()
    } finally {
      setIsRefreshing(false)
    }
  }

  const handleSnapshot = async () => {
    setIsSnapshotLoading(true)
    try {
      const response = await fetch('/api/historico/sol-snapshot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const result = await response.json()

      if (result.success) {
        // Mostrar mensaje de éxito y refrescar datos
        alert(`✅ Snapshot SOL creado exitosamente!\n${result.message}`)
        // Refrescar los datos para mostrar el nuevo snapshot
        await refetch()
      } else {
        alert(`❌ Error al crear snapshot: ${result.error}`)
      }
    } catch (error) {
      console.error('Error al tomar snapshot:', error)
      alert('❌ Error al comunicarse con el servidor')
    } finally {
      setIsSnapshotLoading(false)
    }
  }

  const handleExport = () => {
    if (!data?.success || !data.data) return

    const processedData = data.data
    const csvHeaders = ['Evaluador', ...processedData.fechas].join(',')
    const csvRows = processedData.operadores.map(operador => {
      const row = [operador.operador]
      processedData.fechas.forEach(fecha => {
        row.push((operador[fecha] || 0).toString())
      })
      return row.join(',')
    })

    const csvContent = [csvHeaders, ...csvRows].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute('download', `sol_avance_pendientes_${new Date().toISOString().split('T')[0]}.csv`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }

  if (isLoading) {
    return (
      <SectionCard className={className}>
        <SectionHeader
          icon={<Activity className="h-6 w-6 text-blue-600" />}
          title="Avance de Pendientes SOL"
          description="Cargando datos históricos..."
        />
        <div className="flex justify-center items-center h-64">
          <div className="flex items-center space-x-2">
            <RefreshCw className="h-6 w-6 animate-spin text-blue-500" />
            <span className="text-gray-600">Cargando avance de pendientes SOL...</span>
          </div>
        </div>
      </SectionCard>
    )
  }

  if (error) {
    return (
      <SectionCard className={className}>
        <SectionHeader
          icon={<Activity className="h-6 w-6 text-red-600" />}
          title="Avance de Pendientes SOL"
          description="Error al cargar datos"
        />
        <div className="text-center py-8">
          <p className="text-red-600 mb-4">Error: {(error as Error).message}</p>
          <button
            onClick={handleRefresh}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
          >
            Reintentar
          </button>
        </div>
      </SectionCard>
    )
  }

  if (!data?.success || !data.data || data.data.fechas.length === 0) {
    return (
      <SectionCard className={className}>
        <SectionHeader
          icon={<Activity className="h-6 w-6 text-gray-400" />}
          title="Avance de Pendientes SOL"
          description="No hay datos históricos disponibles"
          actions={
            <div className="flex items-center space-x-2">
              {/* Botón de Snapshot siempre visible */}
              <button
                onClick={handleSnapshot}
                disabled={isSnapshotLoading}
                className="flex items-center space-x-2 px-4 py-2 bg-orange-100 text-orange-700 border border-orange-200 rounded-lg hover:bg-orange-200 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Camera className={`h-4 w-4 ${isSnapshotLoading ? 'animate-pulse' : ''}`} />
                <span>{isSnapshotLoading ? 'Tomando...' : 'Tomar Snapshot'}</span>
              </button>
              
              <button
                onClick={handleExport}
                className="flex items-center space-x-2 px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
              >
                <Download className="h-4 w-4" />
                <span>Exportar</span>
              </button>
            </div>
          }
        />
        <div className="text-center py-8">
          <div className="flex flex-col items-center space-y-4">
            <Camera className="h-16 w-16 text-gray-300" />
            <div>
              <p className="text-gray-600 font-medium">No hay datos históricos de SOL disponibles</p>
              <p className="text-sm text-gray-500 mt-2">
                Utiliza el botón <span className="inline-flex items-center px-2 py-1 bg-orange-100 text-orange-800 rounded text-xs font-medium">
                  <Camera className="h-3 w-3 mr-1" />
                  Tomar Snapshot
                </span> para comenzar a registrar el histórico
              </p>
            </div>
          </div>
        </div>
      </SectionCard>
    )
  }

  const processedData = data.data
  
  // 1. Corregir orden de fechas (ascendente) y filtrar
  const fechasOrdenadas = [...new Set(processedData.fechas)]
    .sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
  const fechasFiltradas = fechasOrdenadas.slice(-periodoSeleccionado);
  
  // --- KPI Calculations ---
  const totalOperadores = processedData.operadores.length;
  const ultimaFechaRaw = processedData.fechas[0];
  const ultimaFechaFormateada = formatDateShort(ultimaFechaRaw);
  const totalActual = processedData.operadores.reduce((sum, op) => {
    return sum + (op[ultimaFechaRaw] as number || 0);
  }, 0);
  // --------------------

  return (
    <SectionCard className={className}>
      {/* Header */}
      <SectionHeader
        icon={<Activity className="h-6 w-6 text-blue-600" />}
        title="Avance de Pendientes SOL"
        description="Histórico de pendientes por evaluador y fecha."
        actions={
          <div className="flex items-center space-x-2">
            {/* Selector de período */}
            <div className="flex items-center space-x-1 bg-white p-1.5 rounded-lg shadow-sm border border-gray-200">
              {[7, 15, 30, 60, 90].map((dias) => (
                <button
                  key={dias}
                  onClick={() => setPeriodoSeleccionado(dias)}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    periodoSeleccionado === dias
                      ? 'bg-blue-500 text-white shadow-md'
                      : 'text-gray-600 hover:bg-blue-50'
                  }`}
                >
                  {dias} días
                </button>
              ))}
            </div>
          </div>
        }
      />

      {/* KPI Cards Section */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {/* Tarjeta Operadores */}
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex items-center">
            <div className="bg-blue-100 p-3 rounded-full mr-4">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Operadores</p>
              <p className="text-2xl font-bold text-gray-900">{totalOperadores}</p>
            </div>
          </div>
          {/* Tarjeta Última Fecha */}
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex items-center">
            <div className="bg-orange-100 p-3 rounded-full mr-4">
              <Calendar className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Última Fecha</p>
              <p className="text-2xl font-bold text-gray-900">{ultimaFechaFormateada}</p>
            </div>
          </div>
          {/* Tarjeta Total Actual */}
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex items-center">
            <div className="bg-green-100 p-3 rounded-full mr-4">
              <ActivityIcon className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Actual</p>
              <p className="text-2xl font-bold text-gray-900">{totalActual.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Botones de acción debajo de KPIs y encima de la tabla */}
      <div className="px-6 pt-4 pb-2 flex justify-end gap-2">
        <button
          onClick={handleSnapshot}
          disabled={isSnapshotLoading}
          className="flex items-center space-x-2 px-4 py-2 bg-orange-100 text-orange-700 border border-orange-200 rounded-lg hover:bg-orange-200 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Camera className={`h-4 w-4 ${isSnapshotLoading ? 'animate-pulse' : ''}`} />
          <span>{isSnapshotLoading ? 'Tomando...' : 'Regrabar Snapshot de Hoy'}</span>
        </button>
        <button
          onClick={handleExport}
          className="flex items-center space-x-2 px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
        >
          <Download className="h-4 w-4" />
          <span>Exportar Excel</span>
        </button>
      </div>

      {/* Tabla */}
      <div 
        ref={tableContainerRef} 
        className="overflow-x-auto border border-gray-200 rounded-lg"
      >
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-100">
            <tr>
              <th className="sticky left-0 z-10 bg-gray-100 px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider border-r border-gray-200">
                <span className="inline-flex items-center gap-1">
                  <Activity className="w-4 h-4 text-gray-400" />
                  Operador
                </span>
              </th>
              {fechasFiltradas.map((fecha) => (
                <th 
                  key={fecha} 
                  className="px-3 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider min-w-[60px]"
                  title={`Fecha: ${fecha} (${formatDateShort(fecha)})`}
                >
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="w-4 h-4 text-gray-300" />
                    {formatDateShort(fecha)}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {processedData.operadores.map((operador, index) => (
              <motion.tr 
                key={operador.operador}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05, duration: 0.3 }}
                className="hover:bg-gray-50 transition-colors"
              >
                <td className="sticky left-0 z-10 bg-white px-4 py-3 text-sm font-medium text-gray-900 border-r border-gray-200">
                  <div className="flex items-center">
                    <div className="text-sm font-medium text-gray-900">
                      {operador.operador}
                    </div>
                  </div>
                </td>
                {fechasFiltradas.map(fecha => {
                  const valor = operador[fecha] as number || 0;
                  return (
                    <td key={fecha} className="px-3 py-3 text-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        valor > 0 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-gray-100 text-gray-500'
                      }`}>
                        {valor.toLocaleString()}
                      </span>
                    </td>
                  );
                })}
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </SectionCard>
  )
} 