import { NextRequest, NextResponse } from 'next/server'
import { neonDB } from '@/lib/neon-api'
import { ProduccionReportData, ProduccionReportSummary, Evaluador, ColorLegend } from '@/types/dashboard'

// Configuración de colores por sub_equipo (reutilizo la misma lógica de pendientes)
const getColorConfig = (subEquipo: string | undefined): { colorClass: string; color: string } => {
  switch (subEquipo?.toUpperCase()) {
    case 'EVALUACION':
      return { colorClass: '', color: 'Blanco' }
    case 'REASIGNADOS':
      return { colorClass: 'bg-orange-100 hover:bg-orange-150', color: 'Naranja' }
    case 'SUSPENDIDA':
      return { colorClass: 'bg-orange-300 hover:bg-orange-350', color: 'Naranja Oscuro' }
    case 'RESPONSABLE':
      return { colorClass: 'bg-green-100 hover:bg-green-150', color: 'Verde' }
    default:
      return { colorClass: 'bg-gray-200 hover:bg-gray-250', color: 'Gris' }
  }
}

// Leyenda de colores para producción
const COLOR_LEGEND: ColorLegend[] = [
  {
    subEquipo: 'EVALUACION',
    color: 'Blanco',
    colorClass: 'bg-white border border-gray-300',
    count: 0,
    description: 'Operadores de Evaluación'
  },
  {
    subEquipo: 'REASIGNADOS',
    color: 'Naranja',
    colorClass: 'bg-orange-100',
    count: 0,
    description: 'Operadores Reasignados'
  },
  {
    subEquipo: 'SUSPENDIDA',
    color: 'Naranja Oscuro',
    colorClass: 'bg-orange-300',
    count: 0,
    description: 'Operadores Suspendidos'
  },
  {
    subEquipo: 'RESPONSABLE',
    color: 'Verde',
    colorClass: 'bg-green-100',
    count: 0,
    description: 'Operadores Responsables'
  },
  {
    subEquipo: 'NO_ENCONTRADO',
    color: 'Gris',
    colorClass: 'bg-gray-200',
    count: 0,
    description: 'Operador no encontrado en registros'
  }
]

// Helper para parsear fechas
function parseDate(fecha: string | null | undefined): Date | null {
  if (!fecha) return null;
  try {
    let date: Date;
    // ISO format YYYY-MM-DD
    if (fecha.includes('-')) {
      date = new Date(fecha);
    } 
    // DD/MM/YYYY format
    else if (fecha.includes('/')) {
      const parts = fecha.split('/');
      if (parts.length === 3) {
        date = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
      } else {
        return null;
      }
    } 
    // Fallback for other formats
    else {
      date = new Date(fecha);
    }
    return isNaN(date.getTime()) ? null : date;
  } catch (error) {
    console.warn('Error parsing date:', fecha, error);
    return null;
  }
}

// Función para determinar si una fecha es día laborable (lunes a viernes)
function isWorkday(dateStr: string): boolean {
  const date = new Date(dateStr);
  const dayOfWeek = date.getDay(); // 0 = domingo, 1 = lunes, ..., 6 = sábado
  return dayOfWeek >= 1 && dayOfWeek <= 5;
}

// Generar lista de días según parámetros
function generateDays(daysCount: number, dayType: 'TODOS' | 'LABORABLES' | 'FIN_DE_SEMANA'): string[] {
  const dates: string[] = [];
  const today = new Date();
  let foundDays = 0;
  let daysBack = 0;
  
  // Buscar hacia atrás hasta encontrar el número de días requeridos del tipo especificado
  while (foundDays < daysCount && daysBack < 365) { // límite de seguridad de 1 año
    const date = new Date(today);
    date.setDate(today.getDate() - daysBack);
    const dateStr = date.toISOString().split('T')[0];
    
    let includeDate = false;
    
    switch (dayType) {
      case 'LABORABLES':
        includeDate = isWorkday(dateStr);
        break;
      case 'FIN_DE_SEMANA':
        includeDate = !isWorkday(dateStr);
        break;
      case 'TODOS':
      default:
        includeDate = true;
        break;
    }
    
    if (includeDate) {
      dates.unshift(dateStr); // Agregar al principio para mantener orden cronológico
      foundDays++;
    }
    
    daysBack++;
  }
  
  return dates;
}

function generateProduccionReport(
  data: any[], 
  evaluadores: Evaluador[], 
  process: 'ccm' | 'prr',
  daysCount: number = 20,
  dayType: 'TODOS' | 'LABORABLES' | 'FIN_DE_SEMANA' = 'TODOS'
): ProduccionReportSummary {
  const operadorMap = new Map<string, { [fecha: string]: number }>();
  const targetDays = generateDays(daysCount, dayType);
  
  console.log(`📅 Días objetivo generados: ${targetDays.length} días`);
  console.log(`📅 Primeros 5 días: ${targetDays.slice(0, 5).join(', ')}`);
  console.log(`📅 Últimos 5 días: ${targetDays.slice(-5).join(', ')}`);
  
  // Verificar qué fechas existen en los datos reales
  const fechasEnDatos = new Set<string>();
  data.forEach(record => {
    if (record.fechapre) {
      const parsedDate = parseDate(record.fechapre);
      if (parsedDate) {
        const dateStr = parsedDate.toISOString().split('T')[0];
        fechasEnDatos.add(dateStr);
      }
    }
  });
  
  console.log(`📊 Total fechas únicas en datos: ${fechasEnDatos.size}`);
  const fechasArray = Array.from(fechasEnDatos).sort();
  if (fechasArray.length > 0) {
    console.log(`📊 Fecha más antigua en datos: ${fechasArray[0]}`);
    console.log(`📊 Fecha más reciente en datos: ${fechasArray[fechasArray.length - 1]}`);
  }
  
  const evaluadorMap = new Map<string, Evaluador>();
  evaluadores.forEach(evaluador => {
    evaluadorMap.set(evaluador.nombre_en_base, evaluador);
  });
  
  data.forEach(record => {
    const operadorName = record.operadorpre || 'Sin Operador';
    const fechapre = record.fechapre;
    
    if (!fechapre) {
      console.warn('Fecha inválida o no procesable:', record.fechapre);
      return;
    }
    
    const parsedDate = parseDate(fechapre);
    if (!parsedDate) return;
    
    const dateStr = parsedDate.toISOString().split('T')[0]; // YYYY-MM-DD
    
    // Solo considerar fechas en los días objetivo
    if (!targetDays.includes(dateStr)) return;
    
    if (!operadorMap.has(operadorName)) {
      operadorMap.set(operadorName, {});
    }
    
    const operadorData = operadorMap.get(operadorName)!;
    operadorData[dateStr] = (operadorData[dateStr] || 0) + 1;
  });
  
  const reportData: ProduccionReportData[] = [];
  const totalByDate: { [fecha: string]: number } = {};
  
  targetDays.forEach((fecha: string) => {
    totalByDate[fecha] = 0;
  });
  
  operadorMap.forEach((fechaData, operadorName) => {
    const evaluador = evaluadorMap.get(operadorName);
    const subEquipo = evaluador?.sub_equipo;
    const { colorClass } = getColorConfig(subEquipo);
    
    const operadorReport: ProduccionReportData = {
      operador: operadorName,
      fechas: {},
      total: 0,
      subEquipo: subEquipo || 'NO_ENCONTRADO',
      colorClass
    };
    
    targetDays.forEach((fecha: string) => {
      const count = fechaData[fecha] || 0;
      operadorReport.fechas[fecha] = count;
      operadorReport.total += count;
      totalByDate[fecha] += count;
    });
    
    if (operadorReport.total > 0) {
      reportData.push(operadorReport);
    }
  });
  
  reportData.sort((a, b) => b.total - a.total);
  
  const grandTotal = Object.values(totalByDate).reduce((sum, count) => sum + count, 0);
  
  // Verificar cuántas fechas tienen datos reales
  const fechasConDatos = targetDays.filter(fecha => totalByDate[fecha] > 0);
  console.log(`📈 Fechas con datos: ${fechasConDatos.length} de ${targetDays.length} días objetivo`);
  console.log(`📈 Fechas con datos: ${fechasConDatos.slice(0, 10).join(', ')}${fechasConDatos.length > 10 ? '...' : ''}`);
  
  // Calcular conteos para la leyenda
  const legendWithCounts = COLOR_LEGEND.map(legendItem => {
    const count = reportData.filter(item => item.subEquipo === legendItem.subEquipo).length;
    return {
      ...legendItem,
      count
    };
  });
  
  return {
    data: reportData,
    fechas: targetDays,
    totalByDate,
    grandTotal,
    process,
    legend: legendWithCounts,
    periodo: `Últimos ${daysCount} ${dayType.toLowerCase().replace('_', ' ')}`
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const process = searchParams.get('process') as 'ccm' | 'prr' | null;
    const days = parseInt(searchParams.get('days') || '20');
    const dayType = (searchParams.get('dayType') || 'TODOS') as 'TODOS' | 'LABORABLES' | 'FIN_DE_SEMANA';

    console.log(`🏭 Generando reporte de producción para proceso: ${process}, días: ${days}, tipo: ${dayType}`);

    if (!process || (process !== 'ccm' && process !== 'prr')) {
      return NextResponse.json(
        { error: 'Parámetro "process" requerido. Debe ser "ccm" o "prr"' },
        { status: 400 }
      )
    }

    if (days < 1 || days > 365) {
      return NextResponse.json(
        { error: 'Parámetro "days" debe estar entre 1 y 365' },
        { status: 400 }
      )
    }

    if (!['TODOS', 'LABORABLES', 'FIN_DE_SEMANA'].includes(dayType)) {
      return NextResponse.json(
        { error: 'Parámetro "dayType" debe ser TODOS, LABORABLES o FIN_DE_SEMANA' },
        { status: 400 }
      )
    }

    let data: any[] = []
    let evaluadores: Evaluador[] = []

    // Usar un rango amplio para obtener datos (máximo 365 días hacia atrás para evitar sobrecarga)
    const maxDaysToFetch = Math.min(days + 30, 365); // Un poco más de margen

    if (process === 'ccm') {
      console.log(`📊 Obteniendo TODOS los datos CCM de producción y evaluadores (últimos ${maxDaysToFetch} días)...`)
      const [ccmData, ccmEvaluadores] = await Promise.all([
        neonDB.getAllCCMProduccion(maxDaysToFetch),
        neonDB.getEvaluadoresCCM()
      ])
      data = ccmData
      evaluadores = ccmEvaluadores
    } else {
      console.log(`📊 Obteniendo TODOS los datos PRR de producción y evaluadores (últimos ${maxDaysToFetch} días)...`)
      const [prrData, prrEvaluadores] = await Promise.all([
        neonDB.getAllPRRProduccion(maxDaysToFetch),
        neonDB.getEvaluadoresPRR()
      ])
      data = prrData
      evaluadores = prrEvaluadores
    }

    console.log(`✅ Datos obtenidos: ${data.length} registros de producción, ${evaluadores.length} evaluadores`)

    const report = generateProduccionReport(data, evaluadores, process, days, dayType);

    console.log(`📋 Reporte generado: ${report.data.length} operadores, ${report.fechas.length} días, ${report.grandTotal} total`)

    return NextResponse.json({
      success: true,
      report,
      meta: {
        processedRecords: data.length,
        uniqueOperators: report.data.length,
        evaluadoresCount: evaluadores.length,
        fechasSpan: report.fechas,
        generatedAt: new Date().toISOString(),
        filters: {
          fechapre: 'Últimos 20 días',
          operadorpre: 'No nulo'
        }
      }
    })

  } catch (error) {
    console.error('❌ Error generando reporte de producción:', error)
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Error interno del servidor',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    )
  }
} 