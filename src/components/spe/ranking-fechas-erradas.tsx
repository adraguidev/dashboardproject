'use client'

import React, { useState } from 'react'
import { useFechasErradas } from '@/hooks/use-fechas-erradas'
import { AlertTriangle, Calendar, Clock, TrendingDown, Users, Eye, X } from 'lucide-react'
import { SectionCard } from '@/components/ui/section-card'
import { SectionHeader } from '@/components/ui/section-header'

interface FechaErradaItem {
  evaluador: string;
  fechaTrabajoOriginal: string;
  numeroTramite: string;
  razonError: string;
  fechaDeteccion: string;
}

interface RankingFechasErradas {
  evaluador: string;
  totalErrores: number;
  erroresPorTipo: {
    fechaFutura: number;
    fechaInvalida: number;
    fechaMuyAntigua: number;
  };
  ejemplosErrores: FechaErradaItem[];
}

// Modal para mostrar ejemplos de errores de un evaluador
const EjemplosErroresModal = ({ 
  evaluador, 
  ejemplos, 
  onClose 
}: { 
  evaluador: string | null; 
  ejemplos: FechaErradaItem[]; 
  onClose: () => void 
}) => {
  if (!evaluador) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex justify-center items-center backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl p-6 m-4 transform transition-all max-h-[90vh] overflow-y-auto" onClick={e=>e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4 border-b pb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Ejemplos de Fechas Erróneas</h2>
            <p className="text-red-600 font-semibold">{evaluador}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100">
            <X className="h-6 w-6 text-gray-600"/>
          </button>
        </div>

        <div className="space-y-3">
          {ejemplos.map((ejemplo, index) => (
            <div key={index} className="border border-red-200 bg-red-50 rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                    <span className="font-semibold text-red-700">{ejemplo.razonError}</span>
                  </div>
                  <div className="text-sm text-gray-700 space-y-1">
                    <p><span className="font-medium">Trámite:</span> {ejemplo.numeroTramite}</p>
                    <p><span className="font-medium">Fecha Original:</span> <code className="bg-white px-2 py-1 rounded text-red-600">{ejemplo.fechaTrabajoOriginal || '(vacío)'}</code></p>
                    <p><span className="font-medium">Detectado:</span> {ejemplo.fechaDeteccion}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function RankingFechasErradas({ className = '' }: { className?: string }) {
  const { data, isLoading, error } = useFechasErradas()
  const [selectedEvaluador, setSelectedEvaluador] = useState<string | null>(null)
  const [ejemplosModal, setEjemplosModal] = useState<FechaErradaItem[]>([])

  const handleVerEjemplos = (evaluador: string, ejemplos: FechaErradaItem[]) => {
    setSelectedEvaluador(evaluador)
    setEjemplosModal(ejemplos)
  }

  const getColorForTipoError = (tipo: 'fechaFutura' | 'fechaInvalida' | 'fechaMuyAntigua') => {
    switch (tipo) {
      case 'fechaFutura': return 'bg-red-100 text-red-700'
      case 'fechaInvalida': return 'bg-orange-100 text-orange-700'
      case 'fechaMuyAntigua': return 'bg-yellow-100 text-yellow-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  const getTipoErrorLabel = (tipo: 'fechaFutura' | 'fechaInvalida' | 'fechaMuyAntigua') => {
    switch (tipo) {
      case 'fechaFutura': return 'Futuras'
      case 'fechaInvalida': return 'Inválidas'
      case 'fechaMuyAntigua': return 'Muy Antiguas'
      default: return ''
    }
  }

  if (isLoading) {
    return (
      <SectionCard className={className}>
        <div className="flex items-center justify-center h-32">
          <div className="text-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-red-600 mx-auto mb-2"></div>
            <p className="text-gray-600 text-sm">Analizando fechas erróneas...</p>
          </div>
        </div>
      </SectionCard>
    )
  }

  if (error) {
    return (
      <SectionCard className={className}>
        <div className="p-4 border border-red-200 bg-red-50 rounded-lg">
          <div className="flex items-center text-red-700">
            <AlertTriangle className="h-5 w-5 mr-3" />
            <h3 className="font-semibold">Error al Cargar Fechas Erróneas</h3>
          </div>
          <p className="mt-2 text-red-600 text-sm">{error.message}</p>
        </div>
      </SectionCard>
    )
  }

  if (!data || data.data.length === 0) {
    return (
      <SectionCard className={className}>
        <SectionHeader
          icon={<Calendar className="h-6 w-6 text-green-600" />}
          title="Ranking de Fechas Erróneas (últimos 60 días)"
          description="¡Excelente! No se detectaron fechas erróneas en los últimos 60 días."
        />
        <div className="text-center py-8">
          <Calendar className="h-12 w-12 text-green-500 mx-auto mb-4" />
          <p className="text-green-700 font-medium">Todas las fechas de trabajo están correctas</p>
        </div>
      </SectionCard>
    )
  }

  return (
    <SectionCard className={className}>
      <SectionHeader
        icon={<AlertTriangle className="h-6 w-6 text-red-600" />}
        title="Ranking de Fechas Erróneas (últimos 60 días)"
        description={`Se detectaron ${data.metadata.totalErroresDetectados} errores en ${data.metadata.totalEvaluadoresConErrores} evaluadores`}
      />

      {/* Estadísticas rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-red-50 p-4 rounded-lg border border-red-200">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-8 w-8 text-red-500" />
            <div>
              <div className="text-2xl font-bold text-red-600">{data.metadata.totalErroresDetectados}</div>
              <div className="text-sm text-red-700">Total Errores</div>
            </div>
          </div>
        </div>
        <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
          <div className="flex items-center gap-3">
            <Users className="h-8 w-8 text-orange-500" />
            <div>
              <div className="text-2xl font-bold text-orange-600">{data.metadata.totalEvaluadoresConErrores}</div>
              <div className="text-sm text-orange-700">Evaluadores Afectados</div>
            </div>
          </div>
        </div>
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <div className="flex items-center gap-3">
            <Clock className="h-8 w-8 text-blue-500" />
            <div>
              <div className="text-2xl font-bold text-blue-600">{data.metadata.periodoAnalisis}</div>
              <div className="text-sm text-blue-700">Período Analizado</div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabla de ranking */}
      <div className="bg-white rounded-lg shadow-md border border-red-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-red-50 text-red-700">
              <tr className="border-b border-red-200">
                <th className="px-4 py-3 text-left font-semibold uppercase text-xs tracking-wider">
                  <div className="flex items-center gap-2">
                    <TrendingDown className="w-4 h-4" />
                    <span>Posición</span>
                  </div>
                </th>
                <th className="px-4 py-3 text-left font-semibold uppercase text-xs tracking-wider">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    <span>Evaluador</span>
                  </div>
                </th>
                <th className="px-4 py-3 text-center font-semibold uppercase text-xs tracking-wider">
                  Total Errores
                </th>
                <th className="px-4 py-3 text-center font-semibold uppercase text-xs tracking-wider">
                  Desglose por Tipo
                </th>
                <th className="px-4 py-3 text-center font-semibold uppercase text-xs tracking-wider">
                  Ejemplos
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-red-100">
              {data.data.map((item, index) => (
                <tr key={item.evaluador} className="hover:bg-red-50 transition-colors">
                  <td className="px-4 py-3 text-sm font-bold text-red-600">
                    #{index + 1}
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-800">
                    {item.evaluador}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold bg-red-100 text-red-700">
                      {item.totalErrores}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex justify-center gap-1 flex-wrap">
                      {Object.entries(item.erroresPorTipo).map(([tipo, cantidad]) => {
                        if (cantidad === 0) return null
                        return (
                          <span 
                            key={tipo}
                            className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${getColorForTipoError(tipo as any)}`}
                          >
                            {getTipoErrorLabel(tipo as any)}: {cantidad}
                          </span>
                        )
                      })}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => handleVerEjemplos(item.evaluador, item.ejemplosErrores)}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors text-xs font-medium"
                    >
                      <Eye className="h-3 w-3" />
                      Ver ({item.ejemplosErrores.length})
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de ejemplos */}
      <EjemplosErroresModal 
        evaluador={selectedEvaluador}
        ejemplos={ejemplosModal}
        onClose={() => {
          setSelectedEvaluador(null)
          setEjemplosModal([])
        }}
      />
    </SectionCard>
  )
} 