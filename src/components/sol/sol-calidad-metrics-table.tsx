'use client'

import React, { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart, Calendar, Filter } from 'lucide-react'
import { SectionCard } from '@/components/ui/section-card'
import { SectionHeader } from '@/components/ui/section-header'
import { FilterSelect } from '@/components/ui/filter-select'
import type { ProcessMetrics } from '@/types/dashboard'

interface SolCalidadMetricsTableProps {
  data: ProcessMetrics[]
  month?: number
  onViewChange?: (view: 'general' | 'monthly') => void
  onMonthChange?: (month: number | undefined) => void
  loading?: boolean
}

const MONTHS_2025 = [
  { value: 1, label: 'Enero 2025' }, { value: 2, label: 'Febrero 2025' },
  { value: 3, label: 'Marzo 2025' }, { value: 4, label: 'Abril 2025' },
  { value: 5, label: 'Mayo 2025' }, { value: 6, label: 'Junio 2025' },
  { value: 7, label: 'Julio 2025' }, { value: 8, label: 'Agosto 2025' },
  { value: 9, label: 'Septiembre 2025' }, { value: 10, label: 'Octubre 2025' },
  { value: 11, label: 'Noviembre 2025' }, { value: 12, label: 'Diciembre 2025' }
]

export function SolCalidadMetricsTable({ 
  data, 
  month, 
  onViewChange, 
  onMonthChange, 
  loading = false 
}: SolCalidadMetricsTableProps) {
  const [view, setView] = useState<'general' | 'monthly'>('general')

  const handleViewChange = (newView: 'general' | 'monthly') => {
    setView(newView)
    onViewChange?.(newView)
    if (newView === 'general') {
      onMonthChange?.(undefined)
    }
  }

  const handleMonthChange = (selectedMonth: number) => {
    onMonthChange?.(selectedMonth)
  }

  const displayData = useMemo(() => {
    if (!data || data.length === 0) return []
    return data.filter(item => item.totalEntries > 0)
  }, [data])

  const totals = useMemo(() => {
    if (!displayData.length) return { totalEntries: 0, avgDiario: 0, avgSemanal: 0, avgMensual: 0 }
    
    const totalEntries = displayData.reduce((sum, item) => sum + item.totalEntries, 0)
    const avgDiario = displayData.reduce((sum, item) => sum + item.avgDiario, 0)
    const avgSemanal = displayData.reduce((sum, item) => sum + item.avgSemanal, 0)
    const avgMensual = view === 'general' ? displayData.reduce((sum, item) => sum + item.avgMensual, 0) : 0
    
    return { totalEntries, avgDiario, avgSemanal, avgMensual }
  }, [displayData, view])

  if (loading) {
    return (
      <SectionCard>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Cargando métricas por calidad...</p>
          </div>
        </div>
      </SectionCard>
    )
  }

  if (!data || data.length === 0) {
    return (
      <SectionCard>
        <SectionHeader
          icon={<BarChart className="h-6 w-6 text-blue-600" />}
          title="Métricas de Ingresos por Calidad"
          description="No hay datos de calidad para analizar."
        />
      </SectionCard>
    )
  }

  const selectedMonthLabel = month ? MONTHS_2025.find(m => m.value === month)?.label : undefined

  return (
    <SectionCard className="overflow-hidden">
      <SectionHeader
        icon={<BarChart className="h-6 w-6 text-blue-600" />}
        title="Métricas de Ingresos por Calidad"
        description={
          view === 'monthly' && selectedMonthLabel 
            ? `Análisis de ingresos para ${selectedMonthLabel}` 
            : "Análisis general de ingresos por calidad"
        }
      />
      
      <div className="my-4 flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="flex items-center space-x-1 bg-white p-1.5 rounded-lg shadow-sm border border-gray-200">
          <button
            onClick={() => handleViewChange('general')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              view === 'general'
                ? 'bg-blue-600 text-white shadow-lg'
                : 'text-gray-600 hover:bg-blue-50'
            }`}
          >
            General
          </button>
          <button
            onClick={() => handleViewChange('monthly')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              view === 'monthly'
                ? 'bg-blue-600 text-white shadow-lg'
                : 'text-gray-600 hover:bg-blue-50'
            }`}
          >
            Por Mes
          </button>
        </div>

        {view === 'monthly' && (
          <FilterSelect
            value={month || ''}
            onChange={e => handleMonthChange(Number(e.target.value))}
            icon={<Calendar className="h-4 w-4" />}
            containerClassName="w-full sm:w-48"
          >
            <option value="">Seleccionar mes...</option>
            {MONTHS_2025.map(monthOption => (
              <option key={monthOption.value} value={monthOption.value}>
                {monthOption.label}
              </option>
            ))}
          </FilterSelect>
        )}
      </div>

      {view === 'monthly' && !month && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <div className="flex items-center">
            <Calendar className="h-5 w-5 text-blue-600 mr-3" />
            <p className="text-blue-800 text-sm">
              Selecciona un mes para ver las métricas específicas de ese período.
            </p>
          </div>
        </div>
      )}

      {(view === 'general' || (view === 'monthly' && month)) && (
        <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 text-gray-600">
                <tr className="border-b border-gray-200">
                  <th className="px-6 py-3 text-left font-semibold uppercase text-xs tracking-wider">
                    <div className="flex items-center gap-2">
                      <Filter className="w-4 h-4 text-gray-400" />
                      <span>Calidad</span>
                    </div>
                  </th>
                  <th className="px-6 py-3 text-right font-semibold uppercase text-xs tracking-wider">Total Ingresos</th>
                  <th className="px-6 py-3 text-right font-semibold uppercase text-xs tracking-wider">Prom. Diario</th>
                  <th className="px-6 py-3 text-right font-semibold uppercase text-xs tracking-wider">Prom. Semanal</th>
                  {view === 'general' && (
                    <th className="px-6 py-3 text-right font-semibold uppercase text-xs tracking-wider">Prom. Mensual</th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {displayData.map((metric) => (
                  <tr key={metric.proceso} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900 max-w-xs break-words">{metric.proceso}</div>
                      <div className="text-xs text-gray-500 whitespace-nowrap">{metric.firstEntry} a {metric.lastEntry}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-700 font-semibold">{metric.totalEntries.toLocaleString('es-PE')}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-600 font-mono">{metric.avgDiario.toFixed(2)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-600 font-mono">{metric.avgSemanal.toFixed(2)}</td>
                    {view === 'general' && (
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-600 font-mono">{metric.avgMensual.toFixed(2)}</td>
                    )}
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-100">
                <tr className="border-t-2 border-gray-200">
                  <th className="px-6 py-3 text-left text-sm font-bold text-gray-800">TOTAL</th>
                  <th className="px-6 py-3 text-right text-sm font-bold text-gray-800">{totals.totalEntries.toLocaleString('es-PE')}</th>
                  <th className="px-6 py-3 text-right text-sm font-bold text-gray-800 font-mono">{totals.avgDiario.toFixed(2)}</th>
                  <th className="px-6 py-3 text-right text-sm font-bold text-gray-800 font-mono">{totals.avgSemanal.toFixed(2)}</th>
                  {view === 'general' && (
                    <th className="px-6 py-3 text-right text-sm font-bold text-gray-800 font-mono">{totals.avgMensual.toFixed(2)}</th>
                  )}
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </SectionCard>
  )
} 