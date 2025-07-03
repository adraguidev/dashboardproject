'use client'

import React, { useState } from 'react'
import * as ExcelJS from 'exceljs'
import { Card } from '../ui/card'
import type { WeeklyIngresosData } from '@/types/dashboard'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'
import { CalendarDays, Download, TrendingUp, BarChart3 } from 'lucide-react'

interface SolWeeklyIngresosTableProps {
  data: WeeklyIngresosData
  loading?: boolean
  className?: string
}

export function SolWeeklyIngresosTable({ data, loading = false, className = '' }: SolWeeklyIngresosTableProps) {
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
        </div>
      </div>

      {/* Gráfico o tabla */}
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
                  <Line type="monotone" dataKey="count" stroke="#a21caf" strokeWidth={2} dot={{ r: 3, fill: '#a21caf' }} name="2025" />
                </LineChart>
              ) : (
                <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="week" />
                  <YAxis />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" fill="#a21caf" name="2025" radius={[2, 2, 0, 0]} />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border border-gray-200 px-4 py-3 text-left font-semibold text-gray-700">Semana</th>
                  <th className="border border-gray-200 px-4 py-3 text-center font-semibold text-gray-700">Período</th>
                  <th className="border border-gray-200 px-4 py-3 text-center font-semibold text-gray-700">Trámites</th>
                </tr>
              </thead>
              <tbody>
                {filteredWeeks.map((week, index) => (
                  <tr key={week.weekNumber} className="border-b border-gray-100">
                    <td className="border border-gray-200 px-4 py-2 text-left">Semana {week.weekNumber}</td>
                    <td className="border border-gray-200 px-4 py-2 text-center">{week.weekRange}</td>
                    <td className="border border-gray-200 px-4 py-2 text-center font-semibold text-purple-700">{week.count.toLocaleString()}</td>
                  </tr>
                ))}
                <tr className="bg-gray-100 font-bold">
                  <td className="border border-gray-200 px-4 py-2 text-left">TOTAL</td>
                  <td className="border border-gray-200 px-4 py-2 text-center">-</td>
                  <td className="border border-gray-200 px-4 py-2 text-center">{totalTramites.toLocaleString()}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Card>
  )
} 