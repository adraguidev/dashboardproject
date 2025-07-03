'use client'

import { useSolIngresos } from '@/hooks/use-sol-ingresos'
import { SolIngresosChart } from './sol-ingresos-chart'
import { SolCalidadMetricsTable } from './sol-calidad-metrics-table'
import { SolMonthlyIngresosTable } from './sol-monthly-ingresos-table'
import { SolWeeklyIngresosTable } from './sol-weekly-ingresos-table'
import { Loading } from '@/components/ui/loading'

export function SolIngresosView() {
  const { report, isLoading, error, setDays, month, setMonth } = useSolIngresos()

  const handleViewChange = (view: 'general' | 'monthly') => {
    if (view === 'general') {
      setMonth(undefined)
    }
  }

  const handleMonthChange = (selectedMonth: number | undefined) => {
    setMonth(selectedMonth)
  }
  
  if (isLoading && !report) {
    return <Loading />
  }

  return (
    <div className="space-y-6">
      {/* 1. Gráfico diario */}
      <SolIngresosChart 
        report={report}
        loading={isLoading}
        error={error}
        onPeriodChange={(newDays: number) => setDays(newDays)}
      />
      {/* 2. Ingresos mensuales (solo 2025) */}
      <SolMonthlyIngresosTable 
        data={report?.monthlyData ?? { currentYear: 2025, previousYear: 2024, months: [] }}
        loading={isLoading}
      />
      {/* 3. Ingresos semanales (solo 2025) */}
      <SolWeeklyIngresosTable 
        data={report?.weeklyData ?? { year: 2025, weeks: [] }}
        loading={isLoading}
      />
      {/* 4. Métricas de Ingresos por Calidad */}
      <SolCalidadMetricsTable 
        data={report?.processMetrics ?? []}
        loading={isLoading}
        month={month}
        onViewChange={handleViewChange}
        onMonthChange={handleMonthChange}
      />
    </div>
  )
} 