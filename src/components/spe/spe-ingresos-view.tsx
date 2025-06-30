'use client'

import React from 'react'
import { useSpeIngresos } from '@/hooks/use-spe-ingresos'
import { SpeIngresosChart } from './spe-ingresos-chart'

export function SpeIngresosView() {
  const { report, isLoading, error, days, setDays } = useSpeIngresos()

  return (
    <div className="space-y-6">
      <SpeIngresosChart 
        report={report} 
        loading={isLoading} 
        error={error}
        onPeriodChange={(newDays) => setDays(newDays)}
      />
    </div>
  )
} 