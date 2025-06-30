import React from 'react';
import type { ProcessMetrics } from '@/types/dashboard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, TrendingUp } from 'lucide-react';

interface SpeProcessMetricsTableProps {
  data: ProcessMetrics[];
}

export function SpeProcessMetricsTable({ data }: SpeProcessMetricsTableProps) {
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Análisis de Ingresos por Proceso</CardTitle>
        </CardHeader>
        <CardContent>
          <p>No hay datos de procesos para analizar.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-gray-50/50">
        <CardTitle className="text-lg font-semibold text-gray-800">
          Métricas de Ingresos por Proceso
        </CardTitle>
        <BarChart className="h-5 w-5 text-gray-500" />
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
              <thead className="bg-gray-100">
                <tr className="border-b">
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Proceso</th>
                  <th className="px-6 py-3 text-right text-xs font-bold text-gray-600 uppercase tracking-wider">Total Ingresos</th>
                  <th className="px-6 py-3 text-right text-xs font-bold text-gray-600 uppercase tracking-wider">Prom. Diario</th>
                  <th className="px-6 py-3 text-right text-xs font-bold text-gray-600 uppercase tracking-wider">Prom. Semanal</th>
                  <th className="px-6 py-3 text-right text-xs font-bold text-gray-600 uppercase tracking-wider">Prom. Mensual</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {data.map((metric) => (
                  <tr key={metric.proceso} className="hover:bg-gray-50 transition-colors duration-150">
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900 max-w-xs break-words">{metric.proceso}</div>
                        <div className="text-xs text-gray-500 whitespace-nowrap">
                          {metric.firstEntry} a {metric.lastEntry}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-700 font-semibold">{metric.totalEntries.toLocaleString('es-PE')}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-600">{metric.avgDiario}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-600">{metric.avgSemanal}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-600">{metric.avgMensual}</td>
                  </tr>
                ))}
              </tbody>
            </table>
        </div>
      </CardContent>
    </Card>
  );
} 