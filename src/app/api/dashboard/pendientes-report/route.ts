import { NextRequest, NextResponse } from 'next/server'
import { neonDB } from '@/lib/neon-api'
import { PendientesReportData, PendientesReportSummary, Evaluador, ColorLegend } from '@/types/dashboard'

// Configuración de colores por sub_equipo
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

// Leyenda de colores
const COLOR_LEGEND: ColorLegend[] = [
  {
    subEquipo: 'EVALUACION',
    color: 'Blanco',
    colorClass: 'bg-white border border-gray-300',
    description: 'Operadores de Evaluación'
  },
  {
    subEquipo: 'REASIGNADOS',
    color: 'Naranja',
    colorClass: 'bg-orange-100',
    description: 'Operadores Reasignados'
  },
  {
    subEquipo: 'SUSPENDIDA',
    color: 'Naranja Oscuro',
    colorClass: 'bg-orange-300',
    description: 'Operadores Suspendidos'
  },
  {
    subEquipo: 'RESPONSABLE',
    color: 'Verde',
    colorClass: 'bg-green-100',
    description: 'Operadores Responsables'
  },
  {
    subEquipo: 'NO_ENCONTRADO',
    color: 'Gris',
    colorClass: 'bg-gray-200',
    description: 'Operador no encontrado en registros'
  }
]

// Helper to parse date strings from multiple formats
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

// Extracts a period string (e.g., "2024", "T1-2024") from a date
function extractPeriodFromDate(
  fechaexpendiente: string | null | undefined,
  groupBy: 'year' | 'quarter' | 'month'
): string | null {
  const date = parseDate(fechaexpendiente);
  if (!date) return null;

  const year = date.getFullYear();
  
  switch (groupBy) {
    case 'quarter':
      const quarter = Math.floor(date.getMonth() / 3) + 1;
      return `T${quarter}-${year}`;
    case 'month':
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      return `${year}-${month}`;
    case 'year':
    default:
      return year.toString();
  }
}

// Custom sort function for periods like "T1-2024", "2024-01", etc.
function customPeriodSort(a: string, b: string): number {
  const getComparableValue = (period: string): number => {
    if (!period) return 0;

    // For quarters: "T1-2024" -> 2024.1
    if (period.startsWith('T')) {
      const parts = period.split('-');
      if (parts.length !== 2) return 0;
      const year = parseInt(parts[1]);
      const quarter = parseInt(parts[0].substring(1));
      return year + quarter / 10; // T1 -> .1, T2 -> .2
    }

    // For months: "2024-05" -> 2024.05
    if (period.includes('-')) {
      const parts = period.split('-');
      if (parts.length !== 2) return 0;
      const year = parseInt(parts[0]);
      const month = parseInt(parts[1]);
      return year + month / 100; // Jan -> .01, Dec -> .12
    }

    // For years: "2024" -> 2024
    return parseInt(period) || 0;
  };

  return getComparableValue(a) - getComparableValue(b);
}

function generatePendientesReport(
  data: any[], 
  evaluadores: Evaluador[], 
  process: 'ccm' | 'prr',
  groupBy: 'year' | 'quarter' | 'month'
): PendientesReportSummary {
  const operadorMap = new Map<string, { [period: string]: number }>();
  const allPeriods = new Set<string>();
  
  const evaluadorMap = new Map<string, Evaluador>();
  evaluadores.forEach(evaluador => {
    evaluadorMap.set(evaluador.nombre_en_base, evaluador);
  });
  
  data.forEach(record => {
    const operadorName = record.operador || 'Sin Operador';
    const period = extractPeriodFromDate(record.fechaexpendiente, groupBy);
    
    if (!period) {
      console.warn('Fecha inválida o no procesable:', record.fechaexpendiente);
      return;
    }
    
    allPeriods.add(period);
    
    if (!operadorMap.has(operadorName)) {
      operadorMap.set(operadorName, {});
    }
    
    const operadorData = operadorMap.get(operadorName)!;
    operadorData[period] = (operadorData[period] || 0) + 1;
  });
  
  const periods = Array.from(allPeriods).sort(customPeriodSort);
  const reportData: PendientesReportData[] = [];
  const totalByPeriod: { [period: string]: number } = {};
  
  periods.forEach(period => {
    totalByPeriod[period] = 0;
  });
  
  operadorMap.forEach((periodData, operadorName) => {
    const evaluador = evaluadorMap.get(operadorName);
    const subEquipo = evaluador?.sub_equipo;
    const { colorClass } = getColorConfig(subEquipo);
    
    const operadorReport: PendientesReportData = {
      operador: operadorName,
      years: {},
      total: 0,
      subEquipo: subEquipo || 'NO_ENCONTRADO',
      colorClass
    };
    
    periods.forEach(period => {
      const count = periodData[period] || 0;
      operadorReport.years[period] = count;
      operadorReport.total += count;
      totalByPeriod[period] += count;
    });
    
    reportData.push(operadorReport);
  });
  
  reportData.sort((a, b) => b.total - a.total);
  
  const grandTotal = Object.values(totalByPeriod).reduce((sum, count) => sum + count, 0);
  
  return {
    data: reportData,
    years: periods,
    totalByYear: totalByPeriod,
    grandTotal,
    process,
    legend: COLOR_LEGEND
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const process = searchParams.get('process') as 'ccm' | 'prr' | null;
    const groupBy = (searchParams.get('groupBy') || 'quarter') as 'year' | 'quarter' | 'month';

    console.log(`🔍 Generando reporte de pendientes para proceso: ${process}, agrupado por: ${groupBy}`);

    if (!process || (process !== 'ccm' && process !== 'prr')) {
      return NextResponse.json(
        { error: 'Parámetro "process" requerido. Debe ser "ccm" o "prr"' },
        { status: 400 }
      )
    }

    let data: any[] = []
    let evaluadores: Evaluador[] = []

    if (process === 'ccm') {
      console.log('📊 Obteniendo TODOS los datos CCM pendientes y evaluadores...')
      const [ccmData, ccmEvaluadores] = await Promise.all([
        neonDB.getAllCCMPendientes(),
        neonDB.getEvaluadoresCCM()
      ])
      data = ccmData
      evaluadores = ccmEvaluadores
    } else {
      console.log('📊 Obteniendo TODOS los datos PRR pendientes y evaluadores...')
      const [prrData, prrEvaluadores] = await Promise.all([
        neonDB.getAllPRRPendientes(),
        neonDB.getEvaluadoresPRR()
      ])
      data = prrData
      evaluadores = prrEvaluadores
    }

    console.log(`✅ Datos obtenidos: ${data.length} registros pendientes, ${evaluadores.length} evaluadores`)

    const report = generatePendientesReport(data, evaluadores, process, groupBy);

    console.log(`📋 Reporte generado: ${report.data.length} operadores, ${report.years.length} periodos, ${report.grandTotal} total`)

    return NextResponse.json({
      success: true,
      report,
      meta: {
        processedRecords: data.length,
        uniqueOperators: report.data.length,
        evaluadoresCount: evaluadores.length,
        yearsSpan: report.years,
        generatedAt: new Date().toISOString(),
        filters: process === 'ccm' ? {
          ultimaetapa: ['EVALUACIÓN - I'],
          estadopre: [''],
          estadotramite: ['PENDIENTE']
        } : {
          ultimaetapa: [
            'ACTUALIZAR DATOS BENEFICIARIO - F',
            'ACTUALIZAR DATOS BENEFICIARIO - I',
            'ASOCIACION BENEFICIARIO - F',
            'ASOCIACION BENEFICIARIO - I',
            'CONFORMIDAD SUB-DIREC.INMGRA. - I',
            'PAGOS, FECHA Y NRO RD. - F',
            'PAGOS, FECHA Y NRO RD. - I',
            'RECEPCIÓN DINM - F'
          ],
          estadopre: [''],
          estadotramite: ['PENDIENTE']
        }
      }
    })

  } catch (error) {
    console.error('❌ Error generando reporte de pendientes:', error)
    
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
 