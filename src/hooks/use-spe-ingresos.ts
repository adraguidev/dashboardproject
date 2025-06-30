import { useQuery } from '@tanstack/react-query'
import { z } from 'zod'
import { useState } from 'react'
import type { IngresosReport } from '@/types/dashboard'

// Esquema que coincide con la estructura de IngresosChartData en dashboard.ts
const ingresosChartDataSchema = z.object({
  fecha: z.string(),
  numeroTramite: z.number(),
  tendencia: z.number().optional(),
});

// Esquema básico para monthlyData y weeklyData
const monthlyDataSchema = z.object({
  currentYear: z.number(),
  previousYear: z.number(),
  months: z.array(z.any())
});

const weeklyDataSchema = z.object({
  year: z.number(),
  weeks: z.array(z.any())
});

// Esquema que coincide con la estructura completa de IngresosReport
const ingresosReportSchema = z.object({
  data: z.array(ingresosChartDataSchema),
  totalTramites: z.number(),
  fechaInicio: z.string(),
  fechaFin: z.string(),
  promedioTramitesPorDia: z.number(),
  diasConDatos: z.number(),
  process: z.string(), // Aceptamos cualquier string y luego hacemos cast
  periodo: z.string(),
  monthlyData: monthlyDataSchema,
  weeklyData: weeklyDataSchema,
});

// Esquema para la respuesta completa de la API
const apiResponseSchema = z.object({
    success: z.boolean(),
    report: ingresosReportSchema
})

const fetchSpeIngresosReport = async (days: number): Promise<IngresosReport> => {
  const response = await fetch(`/api/spe/ingresos?days=${days}`)
  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.error || 'Error al obtener el reporte de ingresos de SPE')
  }
  
  const result = await response.json()
  const parsed = apiResponseSchema.safeParse(result)

  if (!parsed.success) {
    console.error('Error de validación Zod:', parsed.error.flatten())
    throw new Error('Los datos recibidos de la API de ingresos de SPE no son válidos.')
  }
  
  if (!parsed.data.success) {
      throw new Error('La API de ingresos de SPE indicó un fallo en la respuesta.')
  }

  // Aserción de tipo suave para process
  return parsed.data.report as IngresosReport
}

export function useSpeIngresos() {
  const [days, setDays] = useState(30);

  const { data, isLoading, error } = useQuery<IngresosReport, Error>({
    queryKey: ['speIngresosReport', days],
    queryFn: () => fetchSpeIngresosReport(days),
    staleTime: 1000 * 60 * 15, // 15 minutos
  })

  return {
    report: data ?? null,
    isLoading,
    error: error?.message || null,
    days,
    setDays,
  }
} 