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

// Generar lista de los últimos 20 días
function getLast20Days(): string[] {
  const dates: string[] = [];
  const today = new Date();
  
  for (let i = 19; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    dates.push(date.toISOString().split('T')[0]); // YYYY-MM-DD format
  }
  
  return dates;
}

function generateProduccionReport(
  data: any[], 
  evaluadores: Evaluador[], 
  process: 'ccm' | 'prr'
): ProduccionReportSummary {
  const operadorMap = new Map<string, { [fecha: string]: number }>();
  const last20Days = getLast20Days();
  
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
    
    // Solo considerar fechas en los últimos 20 días
    if (!last20Days.includes(dateStr)) return;
    
    if (!operadorMap.has(operadorName)) {
      operadorMap.set(operadorName, {});
    }
    
    const operadorData = operadorMap.get(operadorName)!;
    operadorData[dateStr] = (operadorData[dateStr] || 0) + 1;
  });
  
  const reportData: ProduccionReportData[] = [];
  const totalByDate: { [fecha: string]: number } = {};
  
  last20Days.forEach(fecha => {
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
    
    last20Days.forEach(fecha => {
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
    fechas: last20Days,
    totalByDate,
    grandTotal,
    process,
    legend: legendWithCounts,
    periodo: 'Últimos 20 días'
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const process = searchParams.get('process') as 'ccm' | 'prr' | null;

    console.log(`🏭 Generando reporte de producción para proceso: ${process}`);

    if (!process || (process !== 'ccm' && process !== 'prr')) {
      return NextResponse.json(
        { error: 'Parámetro "process" requerido. Debe ser "ccm" o "prr"' },
        { status: 400 }
      )
    }

    let data: any[] = []
    let evaluadores: Evaluador[] = []

    if (process === 'ccm') {
      console.log('📊 Obteniendo TODOS los datos CCM de producción y evaluadores...')
      const [ccmData, ccmEvaluadores] = await Promise.all([
        neonDB.getAllCCMProduccion(),
        neonDB.getEvaluadoresCCM()
      ])
      data = ccmData
      evaluadores = ccmEvaluadores
    } else {
      console.log('📊 Obteniendo TODOS los datos PRR de producción y evaluadores...')
      const [prrData, prrEvaluadores] = await Promise.all([
        neonDB.getAllPRRProduccion(),
        neonDB.getEvaluadoresPRR()
      ])
      data = prrData
      evaluadores = prrEvaluadores
    }

    console.log(`✅ Datos obtenidos: ${data.length} registros de producción, ${evaluadores.length} evaluadores`)

    const report = generateProduccionReport(data, evaluadores, process);

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