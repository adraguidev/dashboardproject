'use client'

import React from 'react'
import { X, Loader2, BarChart2, Briefcase, FileText } from 'lucide-react'
import { useSpeDetail } from '@/hooks/use-spe-detail'

interface EvaluadorDetailModalProps {
  evaluador: string | null
  onClose: () => void
}

export function EvaluadorDetailModal({ evaluador, onClose }: EvaluadorDetailModalProps) {
  const open = Boolean(evaluador)
  const { data, isLoading, error } = useSpeDetail(evaluador || '', open)

  if (!open) return null

  const totalProcesos = data?.length || 0;
  const totalExpedientes = data?.reduce((sum, proc) => sum + proc.total, 0) || 0;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        className="bg-gray-50 max-w-2xl w-full rounded-xl shadow-2xl border border-gray-200/50 m-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-white border-b rounded-t-xl">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <BarChart2 className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Detalle de Pendientes</h2>
              <p className="text-sm text-gray-500">{evaluador}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Contenido */}
        <div className="p-6 max-h-[70vh] overflow-y-auto">
          {isLoading && (
            <div className="flex items-center justify-center h-40">
              <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
              <p className="ml-3 text-gray-600">Cargando detalle...</p>
            </div>
          )}
          {error && (
            <div className="text-center h-40 flex flex-col justify-center items-center">
              <p className="text-red-600 font-medium">Error al cargar</p>
              <p className="text-sm text-gray-500 mt-1">{error.message}</p>
            </div>
          )}
          {!isLoading && !error && data && (
            <div>
              {/* Resumen */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-white p-4 rounded-lg border flex items-center gap-4">
                  <Briefcase className="w-6 h-6 text-blue-500" />
                  <div>
                    <div className="text-sm text-gray-500">Procesos Distintos</div>
                    <div className="text-2xl font-bold">{totalProcesos}</div>
                  </div>
                </div>
                <div className="bg-white p-4 rounded-lg border flex items-center gap-4">
                   <FileText className="w-6 h-6 text-green-500" />
                  <div>
                    <div className="text-sm text-gray-500">Expedientes Totales</div>
                    <div className="text-2xl font-bold">{totalExpedientes}</div>
                  </div>
                </div>
              </div>

              {/* Tabla de Desglose */}
              {data.length > 0 ? (
                <div className="space-y-4">
                  {data.map(proc => (
                    <details key={proc.proceso} className="bg-white border rounded-lg overflow-hidden" open>
                      <summary className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50">
                        <div className="font-semibold text-gray-800">{proc.proceso}</div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold bg-purple-100 text-purple-800 px-2.5 py-1 rounded-full">
                            {proc.total}
                          </span>
                          <div className="text-gray-400 transition-transform transform group-open:rotate-180">
                            <X className="w-4 h-4" />
                          </div>
                        </div>
                      </summary>
                      <div className="border-t">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50 text-xs text-gray-500">
                            <tr>
                              <th className="px-4 py-2 text-left font-medium">Estado</th>
                              <th className="px-4 py-2 text-right font-medium">Cantidad</th>
                            </tr>
                          </thead>
                          <tbody>
                            {Object.entries(proc.estados)
                              .sort(([, a], [, b]) => b - a)
                              .map(([estado, cant]) => (
                                <tr key={estado} className="border-t">
                                  <td className="px-4 py-2 text-gray-700">{estado}</td>
                                  <td className="px-4 py-2 text-right font-mono text-gray-900">{cant}</td>
                                </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </details>
                  ))}
                </div>
              ) : (
                 <div className="text-center h-40 flex flex-col justify-center items-center bg-white rounded-lg border">
                  <p className="font-medium text-gray-700">No se encontraron expedientes</p>
                  <p className="text-sm text-gray-500 mt-1">Este evaluador no tiene pendientes con etapa "INICIADA" o vacía.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 