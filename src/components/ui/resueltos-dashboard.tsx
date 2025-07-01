'use client'

import React from 'react';
import { Card } from '@/components/ui/card';
import { useResueltosAnalysis, ResueltosAnalysisData } from '@/hooks/use-resueltos-analysis';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, AreaChart, Area } from 'recharts';
import { ArrowUpRight, ArrowDownRight, TrendingUp, CheckCircle, ListTree, Users } from 'lucide-react';

const COLORS = ['#3b82f6', '#10b981', '#f97316', '#ef4444', '#8b5cf6', '#eab308', '#64748b'];

// =================================================================
// COMPONENTE PRINCIPAL DEL DASHBOARD DE RESUELTOS
// =================================================================
function ResueltosDashboardComponent({ proceso }: { proceso: 'ccm' | 'prr' }) {
  const { data, isLoading, error } = useResueltosAnalysis(proceso);

  if (isLoading) return <LoadingSkeleton />;
  if (error || !data) return <ErrorDisplay error={error?.message} />;

  const { summary, monthlyTrends, categoryTrends, operatorsDetails } = data;

  return (
    <div className="space-y-6">
      <DashboardHeader proceso={proceso} />
      <KPISection summary={summary} />

      {/* Tendencia mensual (arriba) */}
      <MonthlyComparisonChart data={monthlyTrends.comparison} />

      {/* Distribución de categorías (debajo) */}
      <CategoryDistributionChart data={summary.currentYear.categories} />

      <CategoryTrendsChart data={categoryTrends} />
      <OperatorsTable data={operatorsDetails} />
    </div>
  );
}

// eslint-disable-next-line react/display-name
export const ResueltosDashboard = React.memo(ResueltosDashboardComponent) as typeof ResueltosDashboardComponent;

// Mantener exportación por defecto para compatibilidad con imports existentes
export default ResueltosDashboard;

// =================================================================
// SUB-COMPONENTES DE VISUALIZACIÓN
// =================================================================

function DashboardHeader({ proceso }: { proceso: 'ccm' | 'prr' }) {
  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
        <CheckCircle className="h-7 w-7 text-blue-600" />
        Análisis de Resoluciones ({proceso.toUpperCase()})
      </h2>
      <p className="text-gray-600 mt-1">
        Comparativa de expedientes resueltos del año actual vs. el año anterior.
      </p>
    </div>
  );
}

function KPISection({ summary }: { summary: ResueltosAnalysisData['summary'] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <KPICard
        title={`Total Resueltos ${summary.currentYear.year}`}
        value={summary.currentYear.total}
        comparisonValue={summary.previousYear.total}
        comparisonText={`vs ${summary.previousYear.year}`}
      />
      <KPICard
        title={`Promedio Mensual ${summary.currentYear.year}`}
        value={summary.currentYear.avgMonthly}
        comparisonValue={summary.previousYear.avgMonthly}
        comparisonText={`vs ${summary.previousYear.year}`}
        isAverage
      />
    </div>
  );
}

function MonthlyComparisonChart({ data }: { data: ResueltosAnalysisData['monthlyTrends']['comparison'] | undefined }) {
  if (!data || data.length === 0) {
    return (
      <Card className="p-6 h-full flex items-center justify-center text-sm text-gray-500">
        No hay datos de tendencia mensual disponibles.
      </Card>
    )
  }
  const currentYear = new Date().getFullYear();
  const previousYear = currentYear - 1;

  return (
    <Card className="p-6 h-full">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <TrendingUp className="h-5 w-5 text-gray-700" />
        Tendencia Mensual Comparativa
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" fontSize={12} />
          <YAxis fontSize={12} />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="currentYear" name={`Año ${currentYear}`} stroke="#3b82f6" strokeWidth={3} />
          <Line type="monotone" dataKey="previousYear" name={`Año ${previousYear}`} stroke="#a1a1aa" strokeWidth={2} strokeDasharray="5 5" />
        </LineChart>
      </ResponsiveContainer>
    </Card>
  );
}

function CategoryDistributionChart({ data }: { data: { name: string; total: number }[] | undefined }) {
  const chartData = data && data.length > 0 ? data : []
  return (
    <Card className="p-6 h-full">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <ListTree className="h-5 w-5 text-gray-700" />
        Distribución por Categorías
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData} layout="vertical" margin={{ left: 100 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis type="number" fontSize={12} />
          <YAxis type="category" dataKey="name" fontSize={11} width={100} tick={{ width: 120 }} />
          <Tooltip />
          <Bar dataKey="total" name="Total" fill="#3b82f6" background={{ fill: '#f1f5f9' }} />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}

function CategoryTrendsChart({ data }: { data: ResueltosAnalysisData['categoryTrends'] | undefined }) {
  if (!data || data.byMonth.length === 0) return null
  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Tendencia de Categorías (Año Actual)</h3>
      <ResponsiveContainer width="100%" height={350}>
        <AreaChart data={data.byMonth}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" fontSize={12} />
          <YAxis fontSize={12} />
          <Tooltip />
          <Legend />
          {data.categories.map((cat, i) => (
            <Area key={cat} type="monotone" dataKey={cat} stackId="1" stroke={COLORS[i % COLORS.length]} fill={COLORS[i % COLORS.length]} fillOpacity={0.7} />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </Card>
  );
}

function OperatorsTable({ data }: { data: ResueltosAnalysisData['operatorsDetails'] | undefined }) {
  if (!data || data.operators.length === 0) return null
  return (
    <Card className="p-0 overflow-hidden">
      <div className="p-4 border-b">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Users className="h-5 w-5 text-gray-700" />
          Productividad de Operadores (Año Actual)
        </h3>
      </div>
      {/* Table for Desktop */}
      <div className="overflow-x-auto hidden md:block">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Operador</th>
              <th className="px-4 py-3 text-center font-medium text-gray-600">Total</th>
              {data.categories.map(cat => (
                <th key={cat} className="px-4 py-3 text-center font-medium text-gray-600">{cat}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {data.operators.slice(0, 15).map((op) => (
              <tr key={op.operator} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-800">{op.operator}</td>
                <td className="px-4 py-3 text-center font-bold">{op.total}</td>
                {data.categories.map(cat => (
                  <td key={cat} className="px-4 py-3 text-center text-gray-600">{(op as any)[cat] || 0}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Cards for Mobile */}
      <div className="block md:hidden p-4 space-y-3">
        {data.operators.slice(0, 15).map(op => (
          <details key={op.operator} className="bg-white rounded-lg shadow border border-gray-200 open:ring-1 open:ring-blue-500">
            <summary className="p-3 cursor-pointer list-none flex justify-between items-center">
              <span className="font-medium text-gray-800">{op.operator}</span>
              <div className="text-right">
                <span className="font-bold text-lg text-blue-600">{op.total}</span>
              </div>
            </summary>
            <div className="border-t border-gray-200 px-3 pt-2 pb-3">
              <h5 className="text-xs text-gray-500 mb-1">Desglose:</h5>
              <div className="space-y-1 text-sm">
                {data.categories.map(cat => (
                  <div key={cat} className="flex justify-between items-center">
                    <span className="text-gray-600">{cat}</span>
                    <span className="font-medium text-gray-800">{(op as any)[cat] || 0}</span>
                  </div>
                ))}
              </div>
            </div>
          </details>
        ))}
      </div>

      {data.operators.length > 15 && (
        <div className="p-4 text-center text-xs text-gray-500 bg-gray-50">
          Mostrando los 15 operadores más productivos.
        </div>
      )}
    </Card>
  );
}

// =================================================================
// COMPONENTES DE UI AUXILIARES
// =================================================================

function KPICard({ title, value, comparisonValue, comparisonText, isAverage = false }: {
  title: string;
  value: number;
  comparisonValue: number;
  comparisonText: string;
  isAverage?: boolean;
}) {
  const change = comparisonValue > 0 ? ((value - comparisonValue) / comparisonValue) * 100 : value > 0 ? 100 : 0;
  const isPositive = change > 0;
  const TrendIcon = isPositive ? ArrowUpRight : ArrowDownRight;

  const formatValue = (val: number) => isAverage ? val.toFixed(1) : val.toLocaleString();

  return (
    <Card className="p-4">
      <h4 className="text-sm font-medium text-gray-600">{title}</h4>
      <div className="flex items-baseline gap-2 mt-1">
        <span className="text-3xl font-bold text-gray-900">{formatValue(value)}</span>
      </div>
      <div className="flex items-center text-xs text-gray-500 mt-2">
        {Math.abs(change) > 0.01 ? (
          <div className={`flex items-center gap-1 ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
            <TrendIcon className="h-4 w-4" />
            <span>{Math.abs(change).toFixed(1)}%</span>
          </div>
        ) : (
          <span className="text-gray-500">Sin cambios</span>
        )}
        <span>vs. {formatValue(comparisonValue)} {comparisonText}</span>
      </div>
    </Card>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="animate-pulse bg-gray-200 h-10 w-1/3 rounded-lg"></div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="animate-pulse bg-gray-200 h-24 rounded-lg"></div>
        <div className="animate-pulse bg-gray-200 h-24 rounded-lg"></div>
      </div>
      <div className="animate-pulse bg-gray-200 h-96 rounded-lg"></div>
      <div className="animate-pulse bg-gray-200 h-64 rounded-lg"></div>
    </div>
  );
}

function ErrorDisplay({ error }: { error?: string }) {
  return (
    <Card className="p-6">
      <div className="text-center text-red-600">
        <h3 className="text-lg font-semibold mb-2">Error al Cargar los Datos</h3>
        <p>{error || 'No se pudieron cargar los datos de resoluciones. Por favor, intenta de nuevo.'}</p>
      </div>
    </Card>
  );
} 