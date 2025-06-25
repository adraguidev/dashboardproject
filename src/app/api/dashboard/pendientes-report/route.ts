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

function extractYearFromDate(fechaexpendiente: string | null | undefined): string | null {
  if (!fechaexpendiente) return null
  
  try {
    // Intentar varios formatos de fecha
    let date: Date
    
    // Si está en formato ISO (YYYY-MM-DD)
    if (fechaexpendiente.includes('-')) {
      date = new Date(fechaexpendiente)
    }
    // Si está en formato DD/MM/YYYY
    else if (fechaexpendiente.includes('/')) {
      const parts = fechaexpendiente.split('/')
      if (parts.length === 3) {
        // Asumiendo DD/MM/YYYY
        date = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`)
      } else {
        return null
      }
    }
    // Otros formatos
    else {
      date = new Date(fechaexpendiente)
    }
    
    if (isNaN(date.getTime())) {
      return null
    }
    
    return date.getFullYear().toString()
  } catch (error) {
    console.warn('Error parsing date:', fechaexpendiente, error)
    return null
  }
}

function generatePendientesReport(
  data: any[], 
  evaluadores: Evaluador[], 
  process: 'ccm' | 'prr'
): PendientesReportSummary {
  const operadorMap = new Map<string, { [year: string]: number }>()
  const allYears = new Set<string>()
  
  // Crear mapa de evaluadores por nombre_en_base
  const evaluadorMap = new Map<string, Evaluador>()
  evaluadores.forEach(evaluador => {
    evaluadorMap.set(evaluador.nombre_en_base, evaluador)
  })
  
  // Procesar cada registro
  data.forEach(record => {
    const operadorName = record.operador || 'Sin Operador'
    const year = extractYearFromDate(record.fechaexpendiente)
    
    if (!year) {
      console.warn('Fecha inválida encontrada:', record.fechaexpendiente)
      return
    }
    
    allYears.add(year)
    
    if (!operadorMap.has(operadorName)) {
      operadorMap.set(operadorName, {})
    }
    
    const operadorData = operadorMap.get(operadorName)!
    operadorData[year] = (operadorData[year] || 0) + 1
  })
  
  // Convertir a array ordenado
  const years = Array.from(allYears).sort()
  const reportData: PendientesReportData[] = []
  const totalByYear: { [year: string]: number } = {}
  
  // Inicializar totales por año
  years.forEach(year => {
    totalByYear[year] = 0
  })
  
  // Generar datos por operador
  operadorMap.forEach((yearData, operadorName) => {
    // Buscar evaluador correspondiente
    const evaluador = evaluadorMap.get(operadorName)
    const subEquipo = evaluador?.sub_equipo
    const { colorClass } = getColorConfig(subEquipo)
    
    const operadorReport: PendientesReportData = {
      operador: operadorName,
      years: {},
      total: 0,
      subEquipo: subEquipo || 'NO_ENCONTRADO',
      colorClass
    }
    
    years.forEach(year => {
      const count = yearData[year] || 0
      operadorReport.years[year] = count
      operadorReport.total += count
      totalByYear[year] += count
    })
    
    reportData.push(operadorReport)
  })
  
  // Ordenar por total descendente
  reportData.sort((a, b) => b.total - a.total)
  
  const grandTotal = Object.values(totalByYear).reduce((sum, count) => sum + count, 0)
  
  return {
    data: reportData,
    years,
    totalByYear,
    grandTotal,
    process,
    legend: COLOR_LEGEND
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const process = searchParams.get('process') // 'ccm' o 'prr'

    console.log(`🔍 Generando reporte de pendientes para proceso: ${process}`)

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

    const report = generatePendientesReport(data, evaluadores, process)

    console.log(`📋 Reporte generado: ${report.data.length} operadores, ${report.years.length} años, ${report.grandTotal} total`)

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
 
 