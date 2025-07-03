import { NextRequest, NextResponse } from 'next/server'
import { getSheetData } from '@/lib/google-sheets'
import { getDrizzleDB } from '@/lib/db'
import { logInfo, logError } from '@/lib/logger'
import { parse, isValid } from 'date-fns'
import { historicoSpeProduccionAgg } from '@/lib/schema/historicos'
import { eq } from 'drizzle-orm'

// Configuración de Google Sheets
const SPREADSHEET_ID = '1_rNxpAUIepZdp_lGkndR_pTGuZ0hr6kBI4lEtt27km0'
const SHEET_NAME = 'MATRIZ'
const SHEET_RANGE = `${SHEET_NAME}!A:K`

export async function POST(request: NextRequest) {
  try {
    logInfo('Iniciando importación masiva de históricos de producción SPE...')
    const rows = await getSheetData(SPREADSHEET_ID, SHEET_RANGE)
    if (!rows || rows.length < 2) {
      return NextResponse.json({ success: false, error: 'No se encontraron datos en Google Sheets.' }, { status: 400 })
    }
    const header = rows[0].map((h: any) => typeof h === 'string' ? h.trim().toUpperCase() : '')
    const dataRows = rows.slice(1)
    // Mapeo de columnas
    const getIndex = (name: string, fallback: number) => header.indexOf(name) !== -1 ? header.indexOf(name) : fallback
    const COL_EXPEDIENTE = getIndex('EXPEDIENTE', 0)
    const COL_EVALUADOR = getIndex('EVALUADOR', 5)
    const COL_FECHA_TRABAJO = getIndex('FECHA_DE_TRABAJO', 9)
    const COL_ETAPA = getIndex('ETAPA', 10)
    // Procesar filas
    let insertados = 0
    let descartados = 0
    const { db } = await getDrizzleDB()
    // Agrupar por evaluador y fecha
    const grupos: Record<string, { fecha: string, evaluador: string, total: number, finalizadas: number, iniciadas: number }> = {};
    for (const row of dataRows) {
      const expediente = row[COL_EXPEDIENTE]
      const evaluador = row[COL_EVALUADOR] || 'Sin Asignar'
      const fechaTrabajoRaw = row[COL_FECHA_TRABAJO]
      const etapa = (row[COL_ETAPA] || '').toString().trim().toUpperCase();
      // Validar expediente y fecha
      if (!expediente || !fechaTrabajoRaw) { descartados++; continue }
      // Parsear fecha_trabajo (acepta YYYY-MM-DD o DD/MM/YYYY)
      let fechaTrabajo: Date | null = null
      if (typeof fechaTrabajoRaw === 'string' && fechaTrabajoRaw.includes('/')) {
        const parsed = parse(fechaTrabajoRaw, 'd/M/yyyy', new Date())
        if (isValid(parsed)) fechaTrabajo = parsed
      } else {
        const parsed = new Date(fechaTrabajoRaw)
        if (isValid(parsed)) fechaTrabajo = parsed
      }
      if (!fechaTrabajo) { descartados++; continue }
      const year = fechaTrabajo.getFullYear()
      if (year < 2025 || fechaTrabajo > new Date()) { descartados++; continue }
      const fechaStr = fechaTrabajo.toISOString().slice(0,10);
      const key = `${evaluador}__${fechaStr}`;
      if (!grupos[key]) {
        grupos[key] = { fecha: fechaStr, evaluador, total: 0, finalizadas: 0, iniciadas: 0 };
      }
      grupos[key].total++;
      if (etapa === 'FINALIZADA') grupos[key].finalizadas++;
      else grupos[key].iniciadas++;
    }
    // Insertar los agregados
    for (const key in grupos) {
      const g = grupos[key];
      await db.insert(historicoSpeProduccionAgg).values({
        fecha: g.fecha,
        evaluador: g.evaluador,
        total: g.total,
        finalizadas: g.finalizadas,
        iniciadas: g.iniciadas,
      });
      insertados++;
    }
    logInfo(`Importación finalizada. Insertados: ${insertados}, Descartados: ${descartados}`)
    return NextResponse.json({ success: true, insertados, descartados })
  } catch (error) {
    logError('Error en importación masiva SPE:', error)
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 })
  }
} 