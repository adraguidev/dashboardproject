'use client'

import React from 'react'
import * as ExcelJS from 'exceljs'
import { Card } from '../ui/card'
import type { MonthlyIngresosData } from '@/types/dashboard'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Calendar, Download } from 'lucide-react'

interface SolMonthlyIngresosTableProps {
  data: MonthlyIngresosData
  loading?: boolean
  className?: string
}

export function SolMonthlyIngresosTable({ data, loading = false, className = '' }: SolMonthlyIngresosTableProps) {
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

  // Preparar datos solo para 2025
  const chartData = data.months.map(month => ({
    month: month.month.substring(0, 3), // "Ene", "Feb", etc.
    count: month.currentYearCount,
    monthName: month.month
  }))

  // Calcular total
  const total = data.months.reduce((sum, month) => sum + month.currentYearCount, 0)

  const exportToExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Ingresos Mensuales');

    worksheet.columns = [
      { header: 'Mes', key: 'month', width: 15 },
      { header: String(data.currentYear), key: 'currYear', width: 15 },
    ];
    worksheet.getRow(1).font = { bold: true };

    data.months.forEach(month => {
      worksheet.addRow({
        month: month.month,
        currYear: month.currentYearCount,
      });
    });

    // Total row
    const totalRow = worksheet.addRow({
      month: 'TOTAL',
      currYear: total,
    });
    totalRow.font = { bold: true };

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ingresos_mensuales_${data.currentYear}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Tooltip personalizado
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null
    const monthData = payload[0].payload
    return (
      <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg">
        <p className="font-semibold text-gray-900 mb-2">{monthData.monthName}</p>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <span className="text-sm text-gray-600">2025:</span>
          <span className="font-bold text-green-600">{monthData.count.toLocaleString()} trámites</span>
        </div>
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
            <p className="text-gray-600 mt-1">Solo 2025</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-2xl font-bold text-green-600">
                {total.toLocaleString()}
              </div>
              <div className="text-sm text-gray-500">2025</div>
            </div>
            <button
              onClick={exportToExcel}
              className="p-2 border rounded-md bg-white hover:bg-gray-100"
              title="Exportar a Excel"
            >
              <Download className="w-5 h-5 text-gray-600" />
            </button>
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
              <Bar 
                dataKey="count" 
                fill="#10b981" 
                name="2025"
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
                  2025
                </th>
              </tr>
            </thead>
            <tbody>
              {data.months.map((month, index) => (
                <tr key={month.month} className="border-b border-gray-100">
                  <td className="border border-gray-200 px-4 py-2 text-left">{month.month}</td>
                  <td className="border border-gray-200 px-4 py-2 text-center font-semibold text-green-700">{month.currentYearCount.toLocaleString()}</td>
                </tr>
              ))}
              <tr className="bg-gray-100 font-bold">
                <td className="border border-gray-200 px-4 py-2 text-left">TOTAL</td>
                <td className="border border-gray-200 px-4 py-2 text-center">{total.toLocaleString()}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </Card>
  )
} 