'use client'

import React from 'react'
import { Card } from './card'
import { PendientesReportSummary } from '@/types/dashboard'
import { BarChart, Calendar, Clock, Tag, Users, FileStack } from 'lucide-react'

interface PendientesReportTableProps {
  report: PendientesReportSummary | null
  loading?: boolean
  error?: string | null
  className?: string
}

export function PendientesReportTable({
  report,
  loading = false,
  error = null,
  className = ''
}: PendientesReportTableProps) {
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
          <p className="text-gray-500 text-sm">No se encontraron registros pendientes</p>
        </div>
      </Card>
    )
  }

  return (
    <Card className={`overflow-hidden shadow-lg ${className}`}>
      {/* Encabezado con estilo mejorado */}
      <div className="p-5 bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
          <div className="flex items-center">
            <FileStack className="h-6 w-6 text-blue-600 mr-2" />
            <h3 className="text-lg font-semibold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
              Reporte de Pendientes por Año - {report.process.toUpperCase()}
            </h3>
          </div>
          <div className="px-3 py-1.5 bg-blue-100 rounded-full text-blue-800 font-medium flex items-center">
            <Clock className="h-4 w-4 mr-1.5" />
            Total: <span className="font-bold ml-1.5">{report.grandTotal.toLocaleString()}</span> pendientes
          </div>
        </div>

        {/* Leyenda de colores mejorada */}
        <div className="flex flex-wrap gap-3 items-center">
          <span className="font-medium text-gray-700 flex items-center">
            <Tag className="h-4 w-4 mr-1.5" /> Categorías:
          </span>
          {report.legend.map((legendItem) => (
            <div key={legendItem.subEquipo} className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-md shadow-sm">
              <div className={`w-3 h-3 rounded-full ${legendItem.colorClass} ring-2 ring-opacity-30 ${legendItem.colorClass.replace('bg-', 'ring-')}`}></div>
              <span className="text-sm text-gray-700 font-medium">
                {legendItem.description}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Tabla con estilo mejorado */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-10 border-b border-gray-200">
                <div className="flex items-center">
                  <Users className="h-4 w-4 mr-1.5 text-gray-400" />
                  <span>Operador</span>
                </div>
              </th>
              <th className="px-4 py-3.5 text-center text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px] border-b border-gray-200">
                <div className="flex items-center justify-center">
                  <Tag className="h-4 w-4 mr-1.5 text-gray-400" />
                  <span>Sub Equipo</span>
                </div>
              </th>
              {report.years.map(year => (
                <th 
                  key={year}
                  className="px-4 py-3.5 text-center text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[80px] border-b border-gray-200"
                >
                  <div className="flex items-center justify-center">
                    <Calendar className="h-3.5 w-3.5 mr-1.5 text-gray-400" />
                    <span>{year}</span>
                  </div>
                </th>
              ))}
              <th className="px-4 py-3.5 text-center text-xs font-medium text-gray-500 uppercase tracking-wider bg-blue-50 min-w-[80px] border-b border-gray-200">
                <div className="flex items-center justify-center">
                  <BarChart className="h-4 w-4 mr-1.5 text-blue-500" />
                  <span className="text-blue-600">Total</span>
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {report.data.map((operadorData, index) => (
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
                  <div className="flex justify-center">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium shadow-sm ${(
                      operadorData.subEquipo === 'EVALUACION' 
                        ? 'bg-blue-50 text-blue-800 border border-blue-200'
                        : operadorData.subEquipo === 'REASIGNADOS'
                        ? 'bg-orange-50 text-orange-800 border border-orange-200'
                        : operadorData.subEquipo === 'SUSPENDIDA'
                        ? 'bg-red-50 text-red-800 border border-red-200'
                        : operadorData.subEquipo === 'RESPONSABLE'
                        ? 'bg-green-50 text-green-800 border border-green-200'
                        : 'bg-gray-50 text-gray-800 border border-gray-200'
                    )}`}>
                      <div className={`w-2 h-2 rounded-full mr-1.5 ${(
                        operadorData.subEquipo === 'EVALUACION' 
                          ? 'bg-blue-500'
                          : operadorData.subEquipo === 'REASIGNADOS'
                          ? 'bg-orange-500'
                          : operadorData.subEquipo === 'SUSPENDIDA'
                          ? 'bg-red-500'
                          : operadorData.subEquipo === 'RESPONSABLE'
                          ? 'bg-green-500'
                          : 'bg-gray-500'
                      )}`}></div>
                      {operadorData.subEquipo === 'NO_ENCONTRADO' ? 'N/A' : operadorData.subEquipo}
                    </span>
                  </div>
                </td>
                {report.years.map(year => {
                  const count = operadorData.years[year] || 0
                  return (
                    <td 
                      key={year}
                      className={`px-4 py-3 text-sm text-center font-mono ${
                        count > 0 
                          ? 'text-gray-900 font-medium'
                          : 'text-gray-400'
                      }`}
                    >
                      {count > 0 ? count.toLocaleString() : '0'}
                    </td>
                  )
                })}
                <td className="px-4 py-3 text-sm text-center font-bold bg-blue-50">
                  <span className="px-2.5 py-1.5 bg-blue-100 text-blue-900 rounded-lg inline-block min-w-[50px]">
                    {operadorData.total.toLocaleString()}
                  </span>
                </td>
              </tr>
            ))}
            
            {/* Fila de totales */}
            <tr className="bg-gradient-to-r from-green-50 to-green-100 border-t-2 border-green-200">
              <td className="px-4 py-3.5 text-sm font-bold text-green-900 sticky left-0 bg-gradient-to-r from-green-50 to-green-100 z-10">
                <div className="flex items-center">
                  <BarChart className="h-4 w-4 mr-1.5 text-green-700" />
                  TOTAL
                </div>
              </td>
              <td className="px-4 py-3.5 text-sm text-center font-bold text-green-800">
                <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-green-200 text-green-900">-</span>
              </td>
              {report.years.map(year => (
                <td 
                  key={year}
                  className="px-4 py-3 text-sm text-center font-bold text-green-900"
                >
                  {report.totalByYear[year]?.toLocaleString() || '0'}
                </td>
              ))}
              <td className="px-4 py-3.5 text-sm text-center font-bold text-green-900 bg-green-200">
                <span className="px-3 py-1.5 bg-white bg-opacity-50 rounded-lg inline-block min-w-[60px] shadow-sm">
                  {report.grandTotal.toLocaleString()}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Estadísticas adicionales con diseño mejorado */}
      <div className="p-5 bg-gray-50 border-t text-sm text-gray-600">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-100 flex items-center">
            <div className="bg-indigo-100 p-2 rounded-md mr-3">
              <Users className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <span className="text-xs text-gray-500 block">Operadores</span>
              <span className="font-semibold text-gray-900">{report.data.length}</span>
            </div>
          </div>
          
          <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-100 flex items-center">
            <div className="bg-blue-100 p-2 rounded-md mr-3">
              <Calendar className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <span className="text-xs text-gray-500 block">Años</span>
              <span className="font-semibold text-gray-900">{report.years.join(', ')}</span>
            </div>
          </div>
          
          <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-100 flex items-center">
            <div className="bg-purple-100 p-2 rounded-md mr-3">
              <FileStack className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <span className="text-xs text-gray-500 block">Proceso</span>
              <span className="font-semibold text-gray-900">{report.process.toUpperCase()}</span>
            </div>
          </div>
          
          <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-100 flex items-center">
            <div className="bg-green-100 p-2 rounded-md mr-3">
              <BarChart className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <span className="text-xs text-gray-500 block">Total General</span>
              <span className="font-semibold text-gray-900">{report.grandTotal.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
} 
 
 