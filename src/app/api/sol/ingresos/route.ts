import { NextRequest, NextResponse } from 'next/server'
import { getSheetData } from '@/lib/google-sheets'
import { logInfo, logError } from '@/lib/logger'
import { cachedOperation } from '@/lib/server-cache'
import { parseDateSafe } from '@/lib/date-utils'

// Estados a excluir (filtros SOL específicos)
const EXCLUDED_STATES = [
  "Pre Aprobado", "Pre Denegado", "Pre Abandono", "Pre No Presentado", 
  "APROBADO", "DENEGADO", "ANULADO", "DESISTIDO", "ABANDONO", 
  "NO PRESENTADO", "Pre Desistido"
]

// Función para extraer solo la fecha (dd/mm/yyyy) de strings como "9/08/2024 1:39:49" o de seriales numéricos de Excel
function extractDateOnly(dateTimeValue: string | number): string | null {
  if (!dateTimeValue) return null
  // Si es número (serial de Excel)
  if (typeof dateTimeValue === 'number') {
    // Excel: días desde 1899-12-30
    const excelEpoch = new Date(Date.UTC(1899, 11, 30))
    const date = new Date(excelEpoch.getTime() + dateTimeValue * 24 * 60 * 60 * 1000)
    const day = date.getUTCDate().toString().padStart(2, '0')
    const month = (date.getUTCMonth() + 1).toString().padStart(2, '0')
    const year = date.getUTCFullYear()
    return `${day}/${month}/${year}`
  }
  // Si es string
  const match = dateTimeValue.match(/^([0-9]{1,2}\/[0-9]{1,2}\/[0-9]{4})/)
  return match ? match[1] : null
}

function parseGoogleSheetsData(rawData: any[][]) {
  if (!rawData || rawData.length < 2) return []
  return rawData.slice(1).map((row, index) => {
    try {
      const expediente = row[1]
      const fechaIngreso = row[2]
      if (!expediente || !fechaIngreso) return null

      const fechaSolo = extractDateOnly(fechaIngreso)
      if (!fechaSolo) return null

      const fechaParsed = parseDateSafe(fechaSolo)
      if (!fechaParsed) return null

      return {
        expediente: expediente.trim(),
        fechaParsed,
        calidad: (row[6] || 'Sin Calidad').trim(),
      }
    } catch (error: any) {
      logError(`Error procesando fila SOL ${index + 2}: ${error.message}`)
      return null
    }
  }).filter(Boolean)
}

function generateChartAndMetrics(parsedData: any[], days: number, month?: number) {
  if (parsedData.length === 0) {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - (days - 1));
    const chartData = [];
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        chartData.push({ fecha: d.toISOString().split('T')[0], numeroTramite: 0 });
    }
    return { chartData, totalTramites: 0, diasConDatos: 0, promedioTramitesPorDia: 0 };
  }

  const dates = parsedData.map((d: any) => d.fechaParsed);
  const maxDateInData = new Date(Math.max.apply(null, dates as any));
  const minDateInData = new Date(Math.min.apply(null, dates as any));
  logInfo(`Ingresos SOL: Rango de fechas de datos parseados: ${minDateInData.toISOString().split('T')[0]} a ${maxDateInData.toISOString().split('T')[0]}`);

  // Lógica de rango dinámico: Usa la fecha máxima de los datos en lugar de la fecha de hoy.
  const endDate = maxDateInData;
  const startDate = new Date(endDate);
  startDate.setDate(endDate.getDate() - (days - 1));

  const latestYearInData = endDate.getFullYear();

  // Filtra los datos al período dinámico para el cálculo
  let dataInPeriod = parsedData;
  if (month !== undefined) {
    dataInPeriod = parsedData.filter((d: any) => 
        d.fechaParsed.getMonth() === month - 1 && 
        d.fechaParsed.getFullYear() === latestYearInData
    );
  } else {
    dataInPeriod = parsedData.filter((d: any) => d.fechaParsed >= startDate && d.fechaParsed <= endDate);
  }

  const groupedByDate: Record<string, number> = {};
  // Agrupa solo los datos dentro del período
  dataInPeriod.forEach((d: any) => {
    const key = d.fechaParsed.toISOString().split('T')[0];
    groupedByDate[key] = (groupedByDate[key] || 0) + 1;
  });
  
  const chartData = [];
  // Determinar el rango del bucle
  const loopStartDate = month !== undefined ? new Date(latestYearInData, month - 1, 1) : startDate;
  const loopEndDate = month !== undefined ? new Date(latestYearInData, month, 0) : endDate;

  for (let d = new Date(loopStartDate); d <= loopEndDate; d.setDate(d.getDate() + 1)) {
    const key = d.toISOString().split('T')[0];
    chartData.push({ fecha: key, numeroTramite: groupedByDate[key] || 0 });
  }

  const totalTramites = chartData.reduce((sum, item) => sum + item.numeroTramite, 0);
  const diasConDatos = chartData.filter(item => item.numeroTramite > 0).length;
  const promedioTramitesPorDia = diasConDatos > 0 ? parseFloat((totalTramites / diasConDatos).toFixed(2)) : 0;

  return { chartData, totalTramites, diasConDatos, promedioTramitesPorDia };
}

function generateMetricsByQuality(parsedData: any[]) {
    const metrics: Record<string, any> = {};

    parsedData.forEach((item: any) => {
        const key = item.calidad;
        if (!metrics[key]) {
            metrics[key] = {
                proceso: key,
                totalEntries: 0,
                dates: []
            };
        }
        metrics[key].totalEntries++;
        metrics[key].dates.push(item.fechaParsed);
    });

    return Object.values(metrics).map((metric: any) => {
        metric.dates.sort((a: Date, b: Date) => a.getTime() - b.getTime());
        const firstEntry = metric.dates[0]?.toISOString().split('T')[0] || '';
        const lastEntry = metric.dates[metric.dates.length - 1]?.toISOString().split('T')[0] || '';
        const totalDays = metric.dates.length > 1 ? (metric.dates[metric.dates.length - 1] - metric.dates[0]) / (1000 * 3600 * 24) + 1 : 1;
        
        return {
            proceso: metric.proceso,
            totalEntries: metric.totalEntries,
            firstEntry,
            lastEntry,
            avgDiario: parseFloat((metric.totalEntries / totalDays).toFixed(2)),
            avgSemanal: parseFloat((metric.totalEntries / (totalDays / 7)).toFixed(2)),
            avgMensual: parseFloat((metric.totalEntries / (totalDays / 30.44)).toFixed(2)),
        };
    }).sort((a, b) => b.totalEntries - a.totalEntries);
}

// --- GENERACIÓN DE DATOS MENSUALES Y SEMANALES (adaptado de SPE) ---
function generateMonthlyData(rawData: any[]): any {
  const header = rawData.length > 0 ? rawData[0].map((h: any) => (typeof h === 'string' ? h.trim().toUpperCase() : '')) : []
  const dataRows = rawData.slice(1)

  const getIndex = (name: string, fallback: number) => header.indexOf(name) === -1 ? fallback : header.indexOf(name)
  const COL_FECHA_INGRESO = getIndex('FECHA_INGRESO', 2)
  const COL_EXPEDIENTE = getIndex('EXPEDIENTE', 1)

  // Usar el año de la fecha más reciente disponible
  const parsedDates = dataRows.map(row => extractDateOnly(row[COL_FECHA_INGRESO])).map(parseDateSafe).filter((d): d is Date => !!d)
  const latestDate = parsedDates.length > 0 ? parsedDates.sort((a,b)=>b.getTime()-a.getTime())[0] : new Date()
  const currentYear = latestDate.getUTCFullYear()
  const previousYear = currentYear - 1

  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ]

  const monthsMap = new Map<number, { currentYearSet: Set<string>, previousYearSet: Set<string> }>()
  for(let i=1; i<=12; i++) {
    monthsMap.set(i, { currentYearSet: new Set(), previousYearSet: new Set() })
  }

  dataRows.forEach(row => {
    const date = parseDateSafe(extractDateOnly(row[COL_FECHA_INGRESO]))
    const expediente = row[COL_EXPEDIENTE]
    if (date && expediente) {
      const year = date.getUTCFullYear()
      const month = date.getUTCMonth() + 1
      const monthEntry = monthsMap.get(month)
      if (monthEntry) {
        if (year === currentYear) {
          monthEntry.currentYearSet.add(expediente)
        } else if (year === previousYear) {
          monthEntry.previousYearSet.add(expediente)
        }
      }
    }
  })

  const months = monthNames.map((monthName, index) => {
    const monthNumber = index + 1
    const monthEntry = monthsMap.get(monthNumber)
    return {
      month: monthName,
      monthNumber: monthNumber,
      currentYearCount: monthEntry?.currentYearSet.size || 0,
      previousYearCount: monthEntry?.previousYearSet.size || 0
    }
  })

  return {
    currentYear,
    previousYear,
    months
  }
}

function generateWeeklyData(rawData: any[]): any {
  const header = rawData.length > 0 ? rawData[0].map((h: any) => (typeof h === 'string' ? h.trim().toUpperCase() : '')) : []
  const dataRows = rawData.slice(1)

  const getIndex = (name: string, fallback: number) => header.indexOf(name) === -1 ? fallback : header.indexOf(name)
  const COL_FECHA_INGRESO = getIndex('FECHA_INGRESO', 2)
  const COL_EXPEDIENTE = getIndex('EXPEDIENTE', 1)

  // Obtener año objetivo: el año de la fecha más reciente disponible
  const parsedDates = dataRows.map(row => extractDateOnly(row[COL_FECHA_INGRESO])).map(parseDateSafe).filter((d): d is Date => !!d)
  const latestDate = parsedDates.length > 0 ? parsedDates.sort((a,b)=>b.getTime()-a.getTime())[0] : new Date()
  const targetYear = latestDate.getUTCFullYear()

  // Mapear trámites únicos por semana del año objetivo
  const weeklyTrams = new Map<number, Set<string>>()

  dataRows.forEach(row => {
    const date = parseDateSafe(extractDateOnly(row[COL_FECHA_INGRESO]))
    const expediente = row[COL_EXPEDIENTE]
    if (date && expediente && date.getUTCFullYear() === targetYear) {
      // Semana ISO (lunes a domingo)
      const weekNumber = getISOWeekNumber(date)
      if (!weeklyTrams.has(weekNumber)) {
        weeklyTrams.set(weekNumber, new Set())
      }
      weeklyTrams.get(weekNumber)!.add(expediente)
    }
  })

  const weeks = []
  const isoWeek1Start = getISOWeek1Start(targetYear)
  for (let i = 1; i <= 53; i++) {
    const weekStart = new Date(isoWeek1Start)
    weekStart.setDate(isoWeek1Start.getDate() + (i - 1) * 7)
    if (weekStart.getUTCFullYear() !== targetYear && weekStart.getUTCMonth() === 0 && i > 4) break
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekStart.getDate() + 6)
    weeks.push({
      weekNumber: i,
      weekRange: `${weekStart.getUTCDate()} ${getMonthShortName(weekStart)} - ${weekEnd.getUTCDate()} ${getMonthShortName(weekEnd)}`,
      startDate: weekStart.toISOString().split('T')[0],
      endDate: weekEnd.toISOString().split('T')[0],
      count: weeklyTrams.get(i)?.size || 0
    })
  }

  return {
    year: targetYear,
    weeks
  }
}

function getISOWeekNumber(date: Date): number {
  const tmp = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  const dayNum = tmp.getUTCDay() || 7
  tmp.setUTCDate(tmp.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1))
  return Math.ceil((((tmp.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
}

function getISOWeek1Start(year: number): Date {
  const d = new Date(Date.UTC(year, 0, 4))
  const day = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() - day + 1)
  return d
}

function getMonthShortName(date: Date): string {
  return ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'][date.getUTCMonth()]
}

async function fetcher(days: number, month?: number) {
  logInfo(`Ingresos SOL: ${days}d, mes ${month || 'todos'}`)
  try {
    const rawData = await getSheetData('1G9HIEiliCgkasTTwdAtoeHB4z9-er2DBboUr91yXsLM', 'MATRIZ_VISAS!A:J')
    logInfo(`Ingresos SOL: Se obtuvieron ${rawData?.length ?? 0} filas crudas de Google Sheets.`);
    
    const parsedData = parseGoogleSheetsData(rawData)
    logInfo(`Ingresos SOL: Se parsearon ${parsedData?.length ?? 0} filas válidas.`);

    if (!parsedData || parsedData.length === 0) {
      logError('Ingresos SOL: No se encontraron datos válidos después del parseo.');
      // Devolvemos una estructura vacía para evitar que el frontend falle
      return {
        success: true,
        report: {
          data: [],
          totalTramites: 0,
          promedioTramitesPorDia: 0,
          diasConDatos: 0,
          processMetrics: [],
          fechaInicio: new Date().toISOString().split('T')[0],
          fechaFin: new Date().toISOString().split('T')[0],
          process: 'sol',
          periodo: month ? `Mes ${month}` : `Últimos ${days} días`,
          monthlyData: { currentYear: 0, previousYear: 0, months: []},
          weeklyData: { year: 0, weeks: []}
        }
      }
    }

    const { chartData, totalTramites, diasConDatos, promedioTramitesPorDia } = generateChartAndMetrics(parsedData, days, month)
    logInfo(`Ingresos SOL: Se generaron ${chartData?.length ?? 0} puntos para el gráfico.`);

    const processMetrics = generateMetricsByQuality(parsedData);
    logInfo(`Ingresos SOL: Se generaron ${processMetrics?.length ?? 0} métricas por calidad.`);
    
    const monthlyData = generateMonthlyData(rawData)
    const weeklyData = generateWeeklyData(rawData)
    
    return {
      success: true,
      report: {
        data: chartData,
        totalTramites,
        promedioTramitesPorDia,
        diasConDatos,
        processMetrics,
        fechaInicio: chartData[0]?.fecha,
        fechaFin: chartData[chartData.length - 1]?.fecha,
        process: 'sol',
        periodo: month ? `Mes ${month}` : `Últimos ${days} días`,
        monthlyData,
        weeklyData
      }
    }
  } catch (error: any) {
    logError(`Error en fetcher de ingresos SOL: ${error.message}`)
    throw error
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const days = parseInt(searchParams.get('days') || '30')
    const month = searchParams.get('month') ? parseInt(searchParams.get('month')!) : undefined
    
    const cacheKey = `sol:ingresos:${days}:${month || 'all'}:v3`
    
    const result = await cachedOperation({
      key: cacheKey,
      fetcher: () => fetcher(days, month),
      ttlSeconds: 300,
    })
    
    return NextResponse.json(result)
  } catch (error: any) {
    logError(`Error en GET /api/sol/ingresos: ${error.message}`)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
} 