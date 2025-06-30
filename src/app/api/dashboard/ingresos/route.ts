import { NextRequest, NextResponse } from 'next/server'
import { createDirectDatabaseAPI } from '@/lib/db'
import { cachedOperation } from '@/lib/server-cache'
import type { IngresosReport, IngresosChartData, MonthlyIngresosData, WeeklyIngresosData, MonthlyIngresosEntry, WeeklyIngresosEntry } from '@/types/dashboard'
import { parseDateSafe } from '@/lib/date-utils'

// Helper para parsear fechas (usa utilidad global)
function parseDate(fecha: string | null | undefined): Date | null {
  return parseDateSafe(fecha);
}

// Helper para formatear fecha como YYYY-MM-DD
function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

// Helper para generar array de fechas entre dos fechas
function generateDateRange(startDate: Date, endDate: Date): string[] {
  const dates: string[] = [];
  const currentDate = new Date(startDate);
  
  while (currentDate <= endDate) {
    dates.push(formatDate(currentDate));
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return dates;
}

// Helper para generar datos mensuales
function generateMonthlyData(data: any[]): MonthlyIngresosData {
  // Usar el año actual del sistema como base
  const systemCurrentYear = new Date().getFullYear();
  const systemPreviousYear = systemCurrentYear - 1;
  
  // Detectar qué años realmente tienen datos
  const yearsInData = new Set<number>();
  data.forEach(record => {
    const parsedDate = parseDateSafe(record.fechaexpendiente);
    if (parsedDate) {
      yearsInData.add(parsedDate.getFullYear());
    }
  });
  
  console.log(`📅 Año actual del sistema: ${systemCurrentYear}, año anterior: ${systemPreviousYear}`);
  console.log(`📅 Años detectados en datos: ${Array.from(yearsInData).sort().join(', ')}`);
  
  // Usar años del sistema, pero verificar si hay datos disponibles
  const currentYear = systemCurrentYear;
  const previousYear = systemPreviousYear;
  
  const hasCurrentYearData = yearsInData.has(currentYear);
  const hasPreviousYearData = yearsInData.has(previousYear);
  
    const monthNames = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];
  
  // Agrupar trámites únicos por mes y año
  const monthlyTramites = new Map<string, Set<string>>(); // "YYYY-MM" -> Set de numerotramite únicos
  
  // Contadores para debug
  let records2024 = 0;
  let records2025 = 0;
  const months2024 = new Set<number>();
  const months2025 = new Set<number>();
  
  data.forEach(record => {
    const fechaExpendiente = record.fechaexpendiente;
    const numeroTramite = record.numerotramite;
    
    const parsedDate = parseDateSafe(fechaExpendiente);
    if (parsedDate && numeroTramite) {
      const year = parsedDate.getFullYear();
      const month = parsedDate.getMonth() + 1; // 1-12
      
      // Debug: contar registros por año
      if (year === 2024) {
        records2024++;
        months2024.add(month);
      } else if (year === 2025) {
        records2025++;
        months2025.add(month);
      }
      
      // Solo procesar año actual y anterior detectados en los datos
      if (year === currentYear || year === previousYear) {
        const key = `${year}-${month.toString().padStart(2, '0')}`;
        
        if (!monthlyTramites.has(key)) {
          monthlyTramites.set(key, new Set<string>());
        }
        monthlyTramites.get(key)!.add(numeroTramite);
      }
    }
  });
  
  // Data processed successfully
  
  // Generar datos por mes
  const months: MonthlyIngresosEntry[] = monthNames.map((monthName, index) => {
    const monthNumber = index + 1;
    const currentYearKey = `${currentYear}-${monthNumber.toString().padStart(2, '0')}`;
    const previousYearKey = `${previousYear}-${monthNumber.toString().padStart(2, '0')}`;
    
    return {
      month: monthName,
      monthNumber,
      currentYearCount: monthlyTramites.get(currentYearKey)?.size || 0,
      previousYearCount: monthlyTramites.get(previousYearKey)?.size || 0
    };
  });
  
  return {
    currentYear,
    previousYear,
    months
  };
}

// Helper para generar datos semanales
function generateWeeklyData(data: any[]): WeeklyIngresosData {
  // Usar el año actual del sistema para las semanas
  const currentYear = new Date().getFullYear();
  
  // Verificar qué años tienen datos
  const yearsInData = new Set<number>();
  data.forEach(record => {
    const parsedDate = parseDateSafe(record.fechaexpendiente);
    if (parsedDate) {
      yearsInData.add(parsedDate.getFullYear());
    }
  });
  
    const hasCurrentYearData = yearsInData.has(currentYear);

  // Agrupar trámites únicos por semana del año actual
  const weeklyTramites = new Map<number, Set<string>>(); // semana -> Set de numerotramite únicos
  
  data.forEach(record => {
    const fechaExpendiente = record.fechaexpendiente;
    const numeroTramite = record.numerotramite;
    
    const parsedDate = parseDateSafe(fechaExpendiente);
    if (parsedDate && numeroTramite && parsedDate.getFullYear() === currentYear) {
      const weekNumber = getWeekNumber(parsedDate);
      
      if (!weeklyTramites.has(weekNumber)) {
        weeklyTramites.set(weekNumber, new Set<string>());
      }
      weeklyTramites.get(weekNumber)!.add(numeroTramite);
    }
  });
  
  // Generar datos para todas las semanas del año actual
  const weeks: WeeklyIngresosEntry[] = [];
  const totalWeeks = getWeeksInYear(currentYear);
  
  for (let weekNum = 1; weekNum <= totalWeeks; weekNum++) {
    const { startDate, endDate } = getWeekDates(currentYear, weekNum);
    const count = weeklyTramites.get(weekNum)?.size || 0;
    
    weeks.push({
      weekNumber: weekNum,
      weekRange: formatWeekRange(startDate, endDate),
      startDate: formatDate(startDate),
      endDate: formatDate(endDate),
      count
    });
  }
  
  return {
    year: currentYear,
    weeks
  };
}

// Helper para obtener el número de semana del año
function getWeekNumber(date: Date): number {
  const startOfYear = new Date(date.getFullYear(), 0, 1);
  const startOfWeek = startOfYear.getDay(); // 0 = domingo, 1 = lunes, etc.
  
  // Ajustar para que la semana comience en lunes
  const adjustedStart = startOfWeek === 0 ? 6 : startOfWeek - 1;
  
  const dayOfYear = Math.floor((date.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
  const weekNumber = Math.floor((dayOfYear + adjustedStart) / 7) + 1;
  
  return Math.max(1, Math.min(weekNumber, 53)); // Máximo 53 semanas por año
}

// Helper para obtener el número total de semanas en un año
function getWeeksInYear(year: number): number {
  // Calcular directamente sin recursión
  const lastDay = new Date(year, 11, 31); // 31 de diciembre
  const startOfYear = new Date(year, 0, 1);
  const startOfWeek = startOfYear.getDay();
  
  // Ajustar para que la semana comience en lunes
  const adjustedStart = startOfWeek === 0 ? 6 : startOfWeek - 1;
  
  const dayOfYear = Math.floor((lastDay.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
  const weekNumber = Math.floor((dayOfYear + adjustedStart) / 7) + 1;
  
  return Math.max(52, Math.min(weekNumber, 53)); // Entre 52 y 53 semanas
}

// Helper para obtener las fechas de inicio y fin de una semana
function getWeekDates(year: number, weekNumber: number): { startDate: Date; endDate: Date } {
  const startOfYear = new Date(year, 0, 1);
  const startOfWeek = startOfYear.getDay(); // 0 = domingo, 1 = lunes, etc.
  
  // Ajustar para que la semana comience en lunes
  const adjustedStart = startOfWeek === 0 ? 6 : startOfWeek - 1;
  
  // Calcular el primer día de la semana específica
  const daysToAdd = (weekNumber - 1) * 7 - adjustedStart;
  const startDate = new Date(year, 0, 1 + daysToAdd);
  
  // El último día de la semana es 6 días después
  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + 6);
  
  return { startDate, endDate };
}

// Helper para formatear el rango de una semana
function formatWeekRange(startDate: Date, endDate: Date): string {
  const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", 
                      "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  
  const startDay = startDate.getDate();
  const endDay = endDate.getDate();
  const startMonth = monthNames[startDate.getMonth()];
  const endMonth = monthNames[endDate.getMonth()];
  
  if (startDate.getMonth() === endDate.getMonth()) {
    return `${startDay}-${endDay} ${startMonth}`;
  } else {
    return `${startDay} ${startMonth} - ${endDay} ${endMonth}`;
  }
}

// Función para procesar los datos y crear el reporte de ingresos
function generateIngresosReport(
  data: any[], 
  process: 'ccm' | 'prr', 
  daysBack: number
): IngresosReport {
  // Si no hay datos, crear un reporte vacío pero válido
  if (!data || data.length === 0) {
    console.warn(`⚠️ No hay datos disponibles para ${process.toUpperCase()}`);
    
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - daysBack + 1);
    
    const fechaInicio = formatDate(startDate);
    const fechaFin = formatDate(today);
    
    // Generar fechas vacías para el rango solicitado
    const allDates = generateDateRange(startDate, today);
    const chartData: IngresosChartData[] = allDates.map(fecha => ({
      fecha,
      numeroTramite: 0,
      tendencia: 0
    }));

    return {
      data: chartData,
      totalTramites: 0,
      fechaInicio,
      fechaFin,
      process,
      periodo: `Últimos ${daysBack} días`,
      promedioTramitesPorDia: 0,
      diasConDatos: 0,
      monthlyData: {
        currentYear: new Date().getFullYear(),
        previousYear: new Date().getFullYear() - 1,
        months: []
      },
      weeklyData: {
        year: new Date().getFullYear(),
        weeks: []
      }
    };
  }

  // Detectar el rango de fechas REAL de los datos
  const fechasReales = data
    .map(record => parseDate(record.fechaexpendiente))
    .filter(date => date !== null)
    .sort((a, b) => b!.getTime() - a!.getTime()); // Más reciente primero

  if (fechasReales.length === 0) {
    throw new Error('No se encontraron fechas válidas en los datos');
  }

  // Usar la fecha más reciente de los datos como "fin" y calcular hacia atrás
  const fechaMasReciente = fechasReales[0]!;
  const startDate = new Date(fechaMasReciente);
  startDate.setDate(fechaMasReciente.getDate() - daysBack + 1); // +1 para incluir el día actual
  
  const fechaInicio = formatDate(startDate);
  const fechaFin = formatDate(fechaMasReciente);

  // Generar rango completo de fechas basado en datos reales
  const allDates = generateDateRange(startDate, fechaMasReciente);
  
  // Agrupar TRÁMITES ÚNICOS por fecha (no registros)
  const ingresosMap = new Map<string, Set<string>>(); // fecha -> Set de numerotramite únicos
  
  // Inicializar todas las fechas con Sets vacíos
  allDates.forEach(fecha => {
    ingresosMap.set(fecha, new Set<string>());
  });

  // Procesar todos los datos - contar trámites únicos por numerotramite
  data.forEach(record => {
    const fechaExpendiente = record.fechaexpendiente;
    const numeroTramite = record.numerotramite;
    
    const parsedDate = parseDate(fechaExpendiente);
    
    if (parsedDate && numeroTramite) {
      const formattedDate = formatDate(parsedDate);
      
      if (ingresosMap.has(formattedDate)) {
        ingresosMap.get(formattedDate)!.add(numeroTramite); // Añadir trámite único al Set
      }
    }
  });

  // Convertir a array de datos para el gráfico - contar trámites únicos
  const chartData: IngresosChartData[] = allDates.map(fecha => ({
    fecha,
    numeroTramite: ingresosMap.get(fecha)?.size || 0 // Contar trámites únicos en el Set
  }));

  // Calcular línea de tendencia (regresión lineal simple)
  const n = chartData.length;
  if (n > 1) {
    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
    
    chartData.forEach((point, index) => {
      sumX += index;
      sumY += point.numeroTramite;
      sumXY += index * point.numeroTramite;
      sumXX += index * index;
    });
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    
    chartData.forEach((point, index) => {
      point.tendencia = Math.max(0, slope * index + intercept);
    });
  }

  // Calcular estadísticas - con trámites únicos
  const totalTramites = Array.from(ingresosMap.values()).reduce((sum, tramitesSet) => sum + tramitesSet.size, 0);
  const diasConDatos = Array.from(ingresosMap.values()).filter(tramitesSet => tramitesSet.size > 0).length;
  const promedioTramitesPorDia = diasConDatos > 0 ? totalTramites / diasConDatos : 0;

  // Generar datos mensuales y semanales
  const monthlyData = generateMonthlyData(data);
  const weeklyData = generateWeeklyData(data);

  const report: IngresosReport = {
    data: chartData,
    totalTramites,
    fechaInicio,
    fechaFin,
    process,
    periodo: `Últimos ${daysBack} días`,
    promedioTramitesPorDia: Math.round(promedioTramitesPorDia * 100) / 100,
    diasConDatos,
    monthlyData,
    weeklyData
  };

  return report;
}

export async function GET(request: NextRequest) {
  // Caching con memoria local
  try {
    const { searchParams } = new URL(request.url);
    const process = searchParams.get('process') as 'ccm' | 'prr' | null;
    const days = parseInt(searchParams.get('days') || '30');

    const cacheKey = `dashboard:ingresos:${process}:v2`;
    const ttl = 6 * 60 * 60; // 6 horas

    if (!['ccm', 'prr'].includes(process || 'ccm')) {
      return NextResponse.json({ 
        error: 'Proceso inválido. Debe ser ccm o prr' 
      }, { status: 400 });
    }

    if (![15, 30, 45, 60, 90].includes(days)) {
      return NextResponse.json({ 
        error: 'Período inválido. Debe ser 15, 30, 45, 60 o 90 días' 
      }, { status: 400 });
    }

    let dailyData: any[] = [];
    let allData: any[] = []; // Datos completos para mensuales/semanales
    let hasDataLimitations = false;

    // Obtener datos según el proceso con manejo robusto de errores
    try {
      // Crear instancia de la API directa a PostgreSQL
      const dbAPI = await createDirectDatabaseAPI();

      if (process === 'ccm') {
        // Datos limitados para gráfico diario
        dailyData = await dbAPI.getCCMIngresos(days);
        // Datos completos para mensuales/semanales (SIN LÍMITE)
        allData = await dbAPI.getAllCCMIngresos();
      } else {
        // Datos limitados para gráfico diario  
        dailyData = await dbAPI.getPRRIngresos(days);
        // Datos completos para mensuales/semanales (SIN LÍMITE)
        allData = await dbAPI.getAllPRRIngresos();
      }
    } catch (error) {
      console.error(`❌ Error obteniendo datos de ${process?.toUpperCase()}:`, error);
      
      // Para PRR, si falla, intentar con datos limitados
      if (process === 'prr') {
        console.warn('⚠️ PRR: Usando estrategia de recuperación con datos limitados');
        hasDataLimitations = true;
        dailyData = []; // Datos vacíos que se manejarán en generateIngresosReport
        allData = [];
      } else {
        // Para CCM, propagar el error ya que generalmente funciona
        throw error;
      }
    }

    // Usar cachedOperation para gestionar el caché y generar datos cuando sea necesario
    const report = await cachedOperation({
      key: cacheKey,
      ttl: ttl,
      operation: async () => {
        // Generar reporte con datos separados
        const dailyReport = generateIngresosReport(dailyData, process as 'ccm' | 'prr', days);
        
        // Generar datos mensuales y semanales INDEPENDIENTES con datos completos
        const monthlyData = generateMonthlyData(allData);
        const weeklyData = generateWeeklyData(allData);
        
        // Combinar en el reporte final
        return {
          ...dailyReport,
          monthlyData,
          weeklyData
        };
      }
    });

    return NextResponse.json({
      success: true,
      report,
      meta: {
        dailyRecords: dailyData.length,
        allRecords: allData.length,
        generatedAt: new Date().toISOString(),
        filters: {
          dailyChart: `Últimos ${days} días`,
          monthlyChart: 'Todos los datos disponibles (2024 vs 2025)',
          weeklyChart: 'Todo el año 2025'
        }
      }
    });

  } catch (error) {
    console.error('❌ Error generando reporte de ingresos:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Error interno del servidor',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
} 