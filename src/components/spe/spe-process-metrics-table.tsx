import React from 'react';
import type { ProcessMetrics } from '@/types/dashboard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

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
    <Card>
      <CardHeader>
        <CardTitle>Análisis de Ingresos por Proceso</CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-50">
                <th className="border border-gray-200 px-4 py-3 text-left font-semibold text-gray-700">Proceso</th>
                <th className="border border-gray-200 px-4 py-3 text-right font-semibold text-gray-700">Total Ingresos</th>
                <th className="border border-gray-200 px-4 py-3 text-right font-semibold text-gray-700">Prom. Diario</th>
                <th className="border border-gray-200 px-4 py-3 text-right font-semibold text-gray-700">Prom. Semanal</th>
                <th className="border border-gray-200 px-4 py-3 text-right font-semibold text-gray-700">Prom. Mensual</th>
              </tr>
            </thead>
            <tbody>
              {data.map((metric, index) => (
                <tr key={metric.proceso}  className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="border border-gray-200 px-4 py-3 font-medium text-gray-900">{metric.proceso}</td>
                    <td className="border border-gray-200 px-4 py-3 text-right text-gray-600">{metric.totalEntries.toLocaleString('es-PE')}</td>
                    <td className="border border-gray-200 px-4 py-3 text-right text-gray-600">{metric.avgDiario}</td>
                    <td className="border border-gray-200 px-4 py-3 text-right text-gray-600">{metric.avgSemanal}</td>
                    <td className="border border-gray-200 px-4 py-3 text-right text-gray-600">{metric.avgMensual}</td>
                </tr>
              ))}
            </tbody>
          </table>
      </CardContent>
    </Card>
  );
} 