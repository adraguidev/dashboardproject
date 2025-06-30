'use client'

import React, { useState } from 'react'
import * as ExcelJS from 'exceljs'
import { Card } from './card'
import type { WeeklyIngresosData } from '@/types/dashboard'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'
import { CalendarDays, TrendingUp, BarChart3, Filter, Download } from 'lucide-react'

interface WeeklyIngresosTableProps {
  data: WeeklyIngresosData
  loading?: boolean
  className?: string
}

export function WeeklyIngresosTable({ data, loading = false, className = '' }: WeeklyIngresosTableProps) {
  const [viewMode, setViewMode] = useState<'chart' | 'table'>('chart')
  const [chartType, setChartType] = useState<'line' | 'bar'>('line')
  const [filterMode, setFilterMode] = useState<'all' | 'with-data'>('with-data')

  const exportToExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Ingresos Semanales');

    worksheet.columns = [
      { header: 'Semana', key: 'weekNumber', width: 15 },
      { header: 'Período', key: 'weekRange', width: 25 },
      { header: 'Trámites', key: 'count', width: 15 },
    ];
    worksheet.getRow(1).font = { bold: true };

    filteredWeeks.forEach(week => {
      worksheet.addRow({
        weekNumber: `Semana ${week.weekNumber}`,
        weekRange: week.weekRange,
        count: week.count
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ingresos_semanales_${data.year}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </Card>
    )
  }

  // Filtrar datos según el modo
  const filteredWeeks = filterMode === 'with-data' 
    ? data.weeks.filter(week => week.count > 0)
    : data.weeks

  // Preparar datos para el gráfico
  const chartData = filteredWeeks.map(week => ({
    week: `S${week.weekNumber}`,
    count: week.count,
    weekRange: week.weekRange,
    weekNumber: week.weekNumber
  }))

  // Calcular estadísticas
  const totalTramites = data.weeks.reduce((sum, week) => sum + week.count, 0)
  const weeksWithData = data.weeks.filter(week => week.count > 0).length
  const averagePerWeek = weeksWithData > 0 ? totalTramites / weeksWithData : 0
  const maxWeek = data.weeks.reduce((max, week) => week.count > max.count ? week : max, data.weeks[0])
  const currentWeek = getCurrentWeekNumber()

  // Tooltip personalizado
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null

    const weekData = payload[0].payload
    return (
      <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg">
        <p className="font-semibold text-gray-900 mb-2">
          Semana {weekData.weekNumber} - {weekData.weekRange}
        </p>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
          <span className="text-sm text-gray-600">Trámites:</span>
          <span className="font-bold text-purple-600">
            {weekData.count.toLocaleString()}
          </span>
        </div>
      </div>
    )
  }

  return (
    <Card className={`overflow-hidden ${className}`}>
      {/* Header */}
      <div className="p-6 bg-gradient-to-r from-purple-50 to-indigo-50 border-b">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <CalendarDays className="h-6 w-6 text-purple-600" />
              Ingresos Semanales {data.year}
            </h3>
            <p className="text-gray-600 mt-1">
              Evolución semanal del año actual
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-purple-600">
              {totalTramites.toLocaleString()}
            </div>
            <div className="text-sm text-gray-500">Total {data.year}</div>
            <div className="text-sm text-gray-600">
              {averagePerWeek.toFixed(0)} promedio/semana
            </div>
          </div>
        </div>

        {/* Controles */}
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex bg-white rounded-lg p-1 shadow-sm">
            <button
              onClick={() => setViewMode('chart')}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                viewMode === 'chart'
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-600 hover:text-purple-600'
              }`}
            >
              Gráfico
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                viewMode === 'table'
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-600 hover:text-purple-600'
              }`}
            >
              Tabla
            </button>
          </div>

          {viewMode === 'chart' && (
            <div className="flex bg-white rounded-lg p-1 shadow-sm">
              <button
                onClick={() => setChartType('line')}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                  chartType === 'line'
                    ? 'bg-purple-600 text-white'
                    : 'text-gray-600 hover:text-purple-600'
                }`}
              >
                <TrendingUp className="h-4 w-4" />
              </button>
              <button
                onClick={() => setChartType('bar')}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                  chartType === 'bar'
                    ? 'bg-purple-600 text-white'
                    : 'text-gray-600 hover:text-purple-600'
                }`}
              >
                <BarChart3 className="h-4 w-4" />
              </button>
            </div>
          )}

          <div className="flex bg-white rounded-lg p-1 shadow-sm">
            <button
              onClick={() => setFilterMode('with-data')}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                filterMode === 'with-data'
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-600 hover:text-purple-600'
              }`}
            >
              Con datos
            </button>
            <button
              onClick={() => setFilterMode('all')}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                filterMode === 'all'
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-600 hover:text-purple-600'
              }`}
            >
              Todas
            </button>
          </div>

          <button
            onClick={exportToExcel}
            className="flex items-center gap-2 px-3 py-1 rounded text-sm font-medium transition-colors bg-white hover:bg-gray-50 border shadow-sm"
          >
            <Download className="h-4 w-4" />
            <span>Exportar</span>
          </button>
        </div>
      </div>

      {/* Contenido */}
      <div className="p-6">
        {viewMode === 'chart' ? (
          <div className="h-80 mb-6">
            <ResponsiveContainer width="100%" height="100%">
              {chartType === 'line' ? (
                <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="week" />
                  <YAxis />
                  <Tooltip content={<CustomTooltip />} />
                  <Line 
                    type="monotone" 
                    dataKey="count" 
                    stroke="#8b5cf6" 
                    strokeWidth={2}
                    dot={{ fill: '#8b5cf6', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              ) : (
                <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="week" />
                  <YAxis />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar 
                    dataKey="count" 
                    fill="#8b5cf6"
                    radius={[2, 2, 0, 0]}
                  />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="overflow-x-auto max-h-96 overflow-y-auto">
            <table className="w-full border-collapse">
              <thead className="sticky top-0 bg-white">
                <tr className="bg-gray-50">
                  <th className="border border-gray-200 px-4 py-3 text-left font-semibold text-gray-700">
                    Semana
                  </th>
                  <th className="border border-gray-200 px-4 py-3 text-left font-semibold text-gray-700">
                    Período
                  </th>
                  <th className="border border-gray-200 px-4 py-3 text-center font-semibold text-gray-700">
                    Trámites
                  </th>
                  <th className="border border-gray-200 px-4 py-3 text-center font-semibold text-gray-700">
                    Estado
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredWeeks.map((week, index) => (
                  <tr 
                    key={week.weekNumber} 
                    className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} ${
                      week.weekNumber === currentWeek ? 'bg-purple-50 border-l-4 border-purple-500' : ''
                    }`}
                  >
                    <td className="border border-gray-200 px-4 py-3 font-medium text-gray-900">
                      Semana {week.weekNumber}
                      {week.weekNumber === currentWeek && (
                        <span className="ml-2 text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
                          Actual
                        </span>
                      )}
                    </td>
                    <td className="border border-gray-200 px-4 py-3 text-gray-600">
                      {week.weekRange}
                    </td>
                    <td className="border border-gray-200 px-4 py-3 text-center font-semibold">
                      <span className={week.count > 0 ? 'text-purple-600' : 'text-gray-400'}>
                        {week.count.toLocaleString()}
                      </span>
                    </td>
                    <td className="border border-gray-200 px-4 py-3 text-center">
                      {week.count > 0 ? (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                          Con datos
                        </span>
                      ) : (
                        <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded">
                          Sin datos
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Estadísticas resumen */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6 pt-6 border-t">
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">{weeksWithData}</div>
            <div className="text-sm text-gray-500">Semanas con datos</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{averagePerWeek.toFixed(0)}</div>
            <div className="text-sm text-gray-500">Promedio semanal</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{maxWeek.count.toLocaleString()}</div>
            <div className="text-sm text-gray-500">Mejor semana (S{maxWeek.weekNumber})</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">{currentWeek}</div>
            <div className="text-sm text-gray-500">Semana actual</div>
          </div>
        </div>
      </div>
    </Card>
  )
}

// Helper para obtener el número de la semana actual
function getCurrentWeekNumber(): number {
  const now = new Date()
  const startOfYear = new Date(now.getFullYear(), 0, 1)
  const startOfWeek = startOfYear.getDay()
  
  const adjustedStart = startOfWeek === 0 ? 6 : startOfWeek - 1
  const dayOfYear = Math.floor((now.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000))
  const weekNumber = Math.floor((dayOfYear + adjustedStart) / 7) + 1
  
  return Math.max(1, weekNumber)
} 