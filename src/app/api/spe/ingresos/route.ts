import { NextRequest, NextResponse } from 'next/server'
import { getSheetData } from '@/lib/google-sheets'
import { unstable_cache } from 'next/cache'
import { subDays, format, isValid, parse, startOfWeek, endOfDay, startOfMonth, startOfYear, endOfYear } from 'date-fns'
import { es } from 'date-fns/locale'
import { logError, logInfo } from '@/lib/logger'
import type { IngresosReport, MonthlyIngresosData, WeeklyIngresosData } from '@/types/dashboard'

// --- CONFIGURACIÓN ---
const SPREADSHEET_ID = '1_rNxpAUIepZdp_lGkndR_pTGuZ0hr6kBI4lEtt27km0'
const SHEET_NAME = 'MATRIZ'
// Leemos columnas clave: EXPEDIENTE, FECHA_INGRESO, EVALUADOR
const SHEET_RANGE = `${SHEET_NAME}!B:F` 

// --- TIPOS DE DATOS ---
interface IngresosChartData {
  fecha: string;
  numeroTramite: number;
  tendencia?: number;
}

// Tipo extendido para SPE
type SpeIngresosReport = Omit<IngresosReport, 'process'> & {
  process: 'spe';
}

// --- HELPERS DE FECHAS Y DATOS ---

function safeParseDate(dateInput: any): Date | null {
    if (!dateInput) return null
    if (typeof dateInput === 'number' && dateInput > 20000) {
        const excelEpoch = new Date(1899, 11, 30)
        const date = new Date(excelEpoch.getTime() + dateInput * 24 * 60 * 60 * 1000)
        return isValid(date) ? endOfDay(date) : null
    }
    if (typeof dateInput === 'string' && dateInput.includes('/')) {
        const parsedDate = parse(dateInput.trim(), 'd/M/yyyy', new Date())
        return isValid(parsedDate) ? endOfDay(parsedDate) : null
    }
    return null
}

function generateDateRange(startDate: Date, endDate: Date): string[] {
    const dates: string[] = []
    let currentDate = new Date(startDate)
    while (currentDate <= endDate) {
        dates.push(format(currentDate, 'yyyy-MM-dd'))
        currentDate.setDate(currentDate.getDate() + 1)
    }
    return dates
}

function generateMonthlyData(rawData: any[]): MonthlyIngresosData {
    const header = rawData.length > 0 ? rawData[0].map((h: any) => (typeof h === 'string' ? h.trim().toUpperCase() : '')) : []
    const dataRows = rawData.slice(1)

    const getIndex = (name: string, fallback: number) => header.indexOf(name) === -1 ? fallback : header.indexOf(name)
    const COL_FECHA_INGRESO = getIndex('FECHA_INGRESO', 1)
    const COL_EXPEDIENTE = getIndex('EXPEDIENTE', 0)

    const currentYear = new Date().getFullYear()
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
        const date = safeParseDate(row[COL_FECHA_INGRESO])
        const expediente = row[COL_EXPEDIENTE]
        if (date && expediente) {
            const year = date.getFullYear()
            const month = date.getMonth() + 1
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

function generateWeeklyData(rawData: any[]): WeeklyIngresosData {
    const header = rawData.length > 0 ? rawData[0].map((h: any) => (typeof h === 'string' ? h.trim().toUpperCase() : '')) : []
    const dataRows = rawData.slice(1)

    const getIndex = (name: string, fallback: number) => header.indexOf(name) === -1 ? fallback : header.indexOf(name)
    const COL_FECHA_INGRESO = getIndex('FECHA_INGRESO', 1)
    const COL_EXPEDIENTE = getIndex('EXPEDIENTE', 0)

    // Obtener año objetivo: el año de la fecha más reciente disponible
    const parsedDates: Date[] = []
    dataRows.forEach(row => {
        const d = safeParseDate(row[COL_FECHA_INGRESO])
        if (d) parsedDates.push(d)
    })
    const latestDate = parsedDates.length > 0 ? parsedDates.sort((a,b)=>b.getTime()-a.getTime())[0] : new Date()
    const targetYear = latestDate.getFullYear()

    // Mapear trámites únicos por semana del año objetivo
    const weeklyTrams = new Map<number, Set<string>>()

    dataRows.forEach(row => {
        const date = safeParseDate(row[COL_FECHA_INGRESO])
        const expediente = row[COL_EXPEDIENTE]
        if (date && expediente && date.getFullYear() === targetYear) {
            const weekNumber = parseInt(format(date, 'w', { locale: es }))
            if (!weeklyTrams.has(weekNumber)) {
                weeklyTrams.set(weekNumber, new Set())
            }
            weeklyTrams.get(weekNumber)!.add(expediente)
        }
    })

    const weeks = []
    const isoWeek1Start = startOfWeek(new Date(targetYear, 0, 4), { weekStartsOn: 1 })
    for (let i = 1; i <= 53; i++) {
        const weekStart = new Date(isoWeek1Start)
        weekStart.setDate(isoWeek1Start.getDate() + (i - 1) * 7)
        if (weekStart.getFullYear() !== targetYear && weekStart.getMonth() === 0 && i > 4) break
        const weekEnd = new Date(weekStart)
        weekEnd.setDate(weekStart.getDate() + 6)
        weeks.push({
            weekNumber: i,
            weekRange: `${format(weekStart, 'd MMM', { locale: es })} - ${format(weekEnd, 'd MMM', { locale: es })}`,
            startDate: format(weekStart, 'yyyy-MM-dd'),
            endDate: format(weekEnd, 'yyyy-MM-dd'),
            count: weeklyTrams.get(i)?.size || 0
        })
    }

    return {
        year: targetYear,
        weeks
    }
}

// --- LÓGICA PRINCIPAL ---

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url)
    const days = parseInt(searchParams.get('days') || '30', 10)

    if (![15, 30, 45, 60, 90].includes(days)) {
        return NextResponse.json({ success: false, error: 'Período de días no válido.' }, { status: 400 })
    }

    try {
        // Obtener los datos crudos una sola vez
        const rawData = await getSheetData(SPREADSHEET_ID, SHEET_RANGE)
        if (!rawData || rawData.length < 2) {
            throw new Error('No se encontraron datos en Google Sheets o el formato es incorrecto.')
        }

        // --- 1. Generar y cachear datos diarios (dependientes del período) ---
        const getCachedDailyData = unstable_cache(
            async () => {
                logInfo(`(Re)generando datos diarios de SPE para los últimos ${days} días.`);
                const header = rawData[0].map((h: any) => (typeof h === 'string' ? h.trim().toUpperCase() : ''))
                const dataRows = rawData.slice(1)
                const getIndex = (name: string, fallback: number) => header.indexOf(name) === -1 ? fallback : header.indexOf(name)
                const COL_FECHA_INGRESO = getIndex('FECHA_INGRESO', 1)
                const COL_EXPEDIENTE = getIndex('EXPEDIENTE', 0)
                
                const endDate = new Date()
                const startDate = subDays(endDate, days - 1)
                const allDatesInRange = generateDateRange(startDate, endDate)
                const ingresosMap = new Map<string, Set<string>>()
                allDatesInRange.forEach(date => ingresosMap.set(date, new Set()))
                dataRows.forEach(row => {
                    const date = safeParseDate(row[COL_FECHA_INGRESO])
                    const expediente = row[COL_EXPEDIENTE]
                    if (date && expediente) {
                        const dateStr = format(date, 'yyyy-MM-dd')
                        if (ingresosMap.has(dateStr)) {
                            ingresosMap.get(dateStr)!.add(expediente)
                        }
                    }
                })
                const chartData: IngresosChartData[] = allDatesInRange.map(date => ({ fecha: date, numeroTramite: ingresosMap.get(date)?.size || 0 }))
                
                const n = chartData.length;
                if (n > 1) {
                  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
                  chartData.forEach((p, i) => { sumX += i; sumY += p.numeroTramite; sumXY += i * p.numeroTramite; sumXX += i * i; });
                  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
                  const intercept = (sumY - slope * sumX) / n;
                  chartData.forEach((p, i) => { p.tendencia = Math.max(0, slope * i + intercept); });
                }

                const totalTramites = chartData.reduce((sum, day) => sum + day.numeroTramite, 0);
                const diasConDatos = chartData.filter(day => day.numeroTramite > 0).length;
                const promedioTramitesPorDia = diasConDatos > 0 ? totalTramites / diasConDatos : 0;
                
                return {
                    data: chartData,
                    totalTramites,
                    fechaInicio: format(startDate, 'yyyy-MM-dd'),
                    fechaFin: format(endDate, 'yyyy-MM-dd'),
                    promedioTramitesPorDia: parseFloat(promedioTramitesPorDia.toFixed(2)),
                    diasConDatos,
                    periodo: `Últimos ${days} días`,
                }
            },
            [`spe-ingresos-diario-v3-${days}`],
            { revalidate: 3600, tags: ['spe-cache', 'spe-diario'] }
        )

        // --- 2. Generar y cachear datos semanales (independientes del período) ---
        const getCachedWeeklyData = unstable_cache(
            async () => {
                logInfo(`(Re)generando datos semanales de SPE para todo el año.`);
                return generateWeeklyData(rawData);
            },
            [`spe-ingresos-semanal-v3`], // Clave estática
            { revalidate: 3600, tags: ['spe-cache', 'spe-semanal'] }
        )

        // --- 3. Obtener ambos sets de datos ---
        const [dailyData, weeklyData, monthlyData] = await Promise.all([
            getCachedDailyData(),
            getCachedWeeklyData(),
            generateMonthlyData(rawData) // Mensual no necesita caché por ahora
        ]);

        // --- 4. Ensamblar el reporte final ---
        const report = {
            ...dailyData,
            process: 'spe' as const,
            weeklyData,
            monthlyData,
        }

        return NextResponse.json({ success: true, report });

    } catch (error) {
        logError('Error en /api/spe/ingresos (GET):', error)
        return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 })
    }
} 