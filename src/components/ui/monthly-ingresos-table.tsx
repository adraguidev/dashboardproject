'use client'

import React from 'react'
import { Card } from './card'
import type { MonthlyIngresosData } from '@/types/dashboard'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { Calendar, TrendingUp, TrendingDown } from 'lucide-react'

interface MonthlyIngresosTableProps {
  data: MonthlyIngresosData
  loading?: boolean
  className?: string
}

export function MonthlyIngresosTable({ data, loading = false, className = '' }: MonthlyIngresosTableProps) {
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

  // Preparar datos para el gráfico
  const chartData = data.months.map(month => ({
    month: month.month.substring(0, 3), // "Ene", "Feb", etc.
    [data.currentYear]: month.currentYearCount,
    [data.previousYear]: month.previousYearCount,
    monthName: month.month
  }))

  // Calcular totales
  const currentYearTotal = data.months.reduce((sum, month) => sum + month.currentYearCount, 0)
  const previousYearTotal = data.months.reduce((sum, month) => sum + month.previousYearCount, 0)
  const difference = currentYearTotal - previousYearTotal
  const percentageChange = previousYearTotal > 0 ? (difference / previousYearTotal) * 100 : 0

  // Tooltip personalizado
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null

    const monthData = payload[0].payload
    return (
      <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg">
        <p className="font-semibold text-gray-900 mb-2">{monthData.monthName}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2">
            <div 
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-sm text-gray-600">{entry.dataKey}:</span>
            <span className="font-bold" style={{ color: entry.color }}>
              {entry.value.toLocaleString()} trámites
            </span>
          </div>
        ))}
      </div>
    )
  }

  return (
    <Card className={`overflow-hidden ${className}`}>
      {/* Header */}
      <div className="p-6 bg-gradient-to-r from-green-50 to-emerald-50 border-b">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Calendar className="h-6 w-6 text-green-600" />
              Ingresos Mensuales
            </h3>
            <p className="text-gray-600 mt-1">
              Comparación {data.previousYear} vs {data.currentYear}
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-green-600">
              {currentYearTotal.toLocaleString()}
            </div>
            <div className="text-sm text-gray-500">{data.currentYear}</div>
            <div className={`flex items-center gap-1 text-sm ${
              difference >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {difference >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
              {Math.abs(percentageChange).toFixed(1)}% vs {data.previousYear}
            </div>
          </div>
        </div>
      </div>

      {/* Gráfico */}
      <div className="p-6">
        <div className="h-80 mb-6">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar 
                dataKey={data.previousYear} 
                fill="#94a3b8" 
                name={`${data.previousYear}`}
                radius={[2, 2, 0, 0]}
              />
              <Bar 
                dataKey={data.currentYear} 
                fill="#10b981" 
                name={`${data.currentYear}`}
                radius={[2, 2, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Tabla */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-50">
                <th className="border border-gray-200 px-4 py-3 text-left font-semibold text-gray-700">
                  Mes
                </th>
                <th className="border border-gray-200 px-4 py-3 text-center font-semibold text-gray-700">
                  {data.previousYear}
                </th>
                <th className="border border-gray-200 px-4 py-3 text-center font-semibold text-gray-700">
                  {data.currentYear}
                </th>
                <th className="border border-gray-200 px-4 py-3 text-center font-semibold text-gray-700">
                  Diferencia
                </th>
                <th className="border border-gray-200 px-4 py-3 text-center font-semibold text-gray-700">
                  % Cambio
                </th>
              </tr>
            </thead>
            <tbody>
              {data.months.map((month, index) => {
                const difference = month.currentYearCount - month.previousYearCount
                const percentChange = month.previousYearCount > 0 
                  ? (difference / month.previousYearCount) * 100 
                  : (month.currentYearCount > 0 ? 100 : 0)

                return (
                  <tr key={month.month} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="border border-gray-200 px-4 py-3 font-medium text-gray-900">
                      {month.month}
                    </td>
                    <td className="border border-gray-200 px-4 py-3 text-center text-gray-600">
                      {month.previousYearCount.toLocaleString()}
                    </td>
                    <td className="border border-gray-200 px-4 py-3 text-center font-semibold text-green-600">
                      {month.currentYearCount.toLocaleString()}
                    </td>
                    <td className={`border border-gray-200 px-4 py-3 text-center font-medium ${
                      difference >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {difference >= 0 ? '+' : ''}{difference.toLocaleString()}
                    </td>
                    <td className={`border border-gray-200 px-4 py-3 text-center font-medium ${
                      percentChange >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {percentChange >= 0 ? '+' : ''}{percentChange.toFixed(1)}%
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr className="bg-gray-100 font-semibold">
                <td className="border border-gray-200 px-4 py-3 text-gray-900">
                  TOTAL
                </td>
                <td className="border border-gray-200 px-4 py-3 text-center text-gray-700">
                  {previousYearTotal.toLocaleString()}
                </td>
                <td className="border border-gray-200 px-4 py-3 text-center text-green-600">
                  {currentYearTotal.toLocaleString()}
                </td>
                <td className={`border border-gray-200 px-4 py-3 text-center ${
                  difference >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {difference >= 0 ? '+' : ''}{difference.toLocaleString()}
                </td>
                <td className={`border border-gray-200 px-4 py-3 text-center ${
                  percentageChange >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {percentageChange >= 0 ? '+' : ''}{percentageChange.toFixed(1)}%
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </Card>
  )
} 