'use client'

import React from 'react'
import { useSpeIngresos } from '@/hooks/use-spe-ingresos'
import { SpeIngresosChart } from './spe-ingresos-chart'
import { SpeProcessMetricsTable } from './spe-process-metrics-table'
import { Card, CardContent } from '@/components/ui/card'

export function SpeIngresosView() {
  const { report, isLoading, error, setDays, month, setMonth } = useSpeIngresos()

  const handleViewChange = (view: 'general' | 'monthly') => {
    if (view === 'general') {
      setMonth(undefined)
    }
  }

  const handleMonthChange = (selectedMonth: number | undefined) => {
    setMonth(selectedMonth)
  }

  return (
    <div className="space-y-6">
      <SpeIngresosChart 
        report={report} 
        loading={isLoading} 
        error={error}
        onPeriodChange={(newDays) => setDays(newDays)}
      />

      {isLoading && (
        <Card>
          <CardContent className="p-6">
            <div className="animate-pulse space-y-4">
              <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
              <div className="h-32 bg-gray-200 rounded"></div>
            </div>
          </CardContent>
        </Card>
      )}
      
      {!isLoading && report?.processMetrics && (
        <SpeProcessMetricsTable 
          data={report.processMetrics} 
          month={month}
          onViewChange={handleViewChange}
          onMonthChange={handleMonthChange}
          loading={isLoading}
        />
      )}
    </div>
  )
} 