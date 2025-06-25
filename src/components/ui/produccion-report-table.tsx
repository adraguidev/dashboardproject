'use client'

import React from 'react'
import { Card } from './card'
import { ProduccionReportSummary } from '@/types/dashboard'

interface ProduccionReportTableProps {
  report: ProduccionReportSummary | null
  loading?: boolean
  error?: string | null
  className?: string
}

export function ProduccionReportTable({
  report,
  loading = false,
  error = null,
  className = ''
}: ProduccionReportTableProps) {
  if (loading) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-4 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="text-center">
          <div className="text-red-600 font-semibold mb-2">Error al cargar reporte</div>
          <p className="text-gray-600 text-sm">{error}</p>
        </div>
      </Card>
    )
  }

  if (!report || report.data.length === 0) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="text-center">
          <div className="text-gray-600 font-semibold mb-2">Sin datos</div>
          <p className="text-gray-500 text-sm">No se encontraron registros de producción en los últimos 20 días</p>
        </div>
      </Card>
    )
  }

  // Función para formatear fecha
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-ES', { 
      day: '2-digit',
      month: '2-digit'
    });
  };

  return (
    <Card className={`overflow-hidden ${className}`}>
      {/* Encabezado */}
      <div className="p-4 bg-gray-50 border-b">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">
            Reporte de Producción por Día y Operador - {report.process.toUpperCase()}
          </h3>
          <div className="text-sm text-gray-600">
            Total: <span className="font-bold">{report.grandTotal.toLocaleString()}</span> expedientes procesados
          </div>
        </div>

        <div className="text-sm text-gray-600 mb-4">
          <span className="font-medium">Período:</span> {report.periodo}
        </div>

        {/* Leyenda de colores */}
        <div className="flex flex-wrap gap-4 text-xs">
          <span className="font-semibold text-gray-700">Leyenda:</span>
          {report.legend.map((legendItem) => (
            <div key={legendItem.subEquipo} className="flex items-center gap-2">
              <div className={`w-4 h-4 rounded ${legendItem.colorClass}`}></div>
              <span className="text-gray-600">
                {legendItem.description}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Tabla */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-100 z-10">
                Operador
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[100px]">
                Sub Equipo
              </th>
              {report.fechas.map(fecha => (
                <th 
                  key={fecha}
                  className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[60px]"
                  title={fecha}
                >
                  {formatDate(fecha)}
                </th>
              ))}
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider bg-blue-50 min-w-[80px]">
                Total
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {report.data.map((operadorData) => (
              <tr 
                key={operadorData.operador}
                className={`transition-colors ${operadorData.colorClass || ''}`}
              >
                <td className={`px-4 py-3 text-sm font-medium text-gray-900 sticky left-0 z-10 border-r ${operadorData.colorClass || 'bg-white'}`}>
                  <div className="max-w-[200px] truncate" title={operadorData.operador}>
                    {operadorData.operador}
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-center">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    operadorData.subEquipo === 'EVALUACION' 
                      ? 'bg-gray-100 text-gray-800'
                      : operadorData.subEquipo === 'REASIGNADOS'
                      ? 'bg-orange-200 text-orange-900'
                      : operadorData.subEquipo === 'SUSPENDIDA'
                      ? 'bg-orange-400 text-orange-950'
                      : operadorData.subEquipo === 'RESPONSABLE'
                      ? 'bg-green-200 text-green-900'
                      : 'bg-gray-300 text-gray-700'
                  }`}>
                    {operadorData.subEquipo === 'NO_ENCONTRADO' ? 'N/A' : operadorData.subEquipo}
                  </span>
                </td>
                {report.fechas.map(fecha => {
                  const count = operadorData.fechas[fecha] || 0
                  return (
                    <td 
                      key={fecha}
                      className={`px-3 py-3 text-sm text-center font-mono ${
                        count > 0 
                          ? 'text-gray-900 font-medium'
                          : 'text-gray-400'
                      }`}
                    >
                      {count > 0 ? count.toLocaleString() : '0'}
                    </td>
                  )
                })}
                <td className="px-4 py-3 text-sm text-center font-bold bg-blue-50 text-blue-900">
                  {operadorData.total.toLocaleString()}
                </td>
              </tr>
            ))}
            
            {/* Fila de totales */}
            <tr className="bg-green-100 border-t-2 border-green-300">
              <td className="px-4 py-3 text-sm font-bold text-green-900 sticky left-0 bg-green-100 z-10">
                TOTAL
              </td>
              <td className="px-4 py-3 text-sm text-center font-bold text-green-900">
                -
              </td>
              {report.fechas.map(fecha => (
                <td 
                  key={fecha}
                  className="px-3 py-3 text-sm text-center font-bold text-green-900"
                >
                  {report.totalByDate[fecha]?.toLocaleString() || '0'}
                </td>
              ))}
              <td className="px-4 py-3 text-sm text-center font-bold text-green-900 bg-green-200">
                {report.grandTotal.toLocaleString()}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Estadísticas adicionales */}
      <div className="p-4 bg-gray-50 border-t text-sm text-gray-600">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <span className="font-medium">Operadores:</span> {report.data.length}
          </div>
          <div>
            <span className="font-medium">Período:</span> {report.periodo}
          </div>
          <div>
            <span className="font-medium">Proceso:</span> {report.process.toUpperCase()}
          </div>
          <div>
            <span className="font-medium">Total General:</span> {report.grandTotal.toLocaleString()}
          </div>
        </div>
      </div>
    </Card>
  )
} 