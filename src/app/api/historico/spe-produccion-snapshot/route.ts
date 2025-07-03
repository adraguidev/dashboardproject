import { NextResponse, NextRequest } from 'next/server'
import { getDrizzleDB } from '@/lib/db'
import { historicoSpeProduccionAgg } from '@/lib/schema/historicos'
import { getSheetData } from '@/lib/google-sheets'
import { format, parse, isValid } from 'date-fns'
import { toZonedTime } from 'date-fns-tz'
import { logInfo, logError } from '@/lib/logger'
import { eq, and } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

// Configuración de Google Sheets
const SPREADSHEET_ID = '1_rNxpAUIepZdp_lGkndR_pTGuZ0hr6kBI4lEtt27km0'
const SHEET_NAME = 'MATRIZ'
const SHEET_RANGE = `${SHEET_NAME}!A:K`

function safeParseDate(dateInput: any): Date | null {
  if (!dateInput) return null;

  let date: Date | null = null;

  // Manejo robusto de fechas de Excel/Sheets (números seriales)
  if (typeof dateInput === 'number' && dateInput > 20000) { 
    try {
      const excelEpoch = new Date(1900, 0, dateInput - 1);
      if (isValid(excelEpoch)) {
        date = excelEpoch;
      }
    } catch (error) {
      logInfo(`Error parseando fecha numérica de Excel: ${dateInput}`);
    }
  } else if (typeof dateInput === 'string') {
    const trimmedDate = dateInput.trim();
    if (trimmedDate === '' || trimmedDate.length < 6) {
      return null;
    }
    try {
      if (trimmedDate.includes('/')) {
        const formats = ['d/M/yyyy', 'dd/MM/yyyy', 'M/d/yyyy', 'MM/dd/yyyy'];
        for (const fmt of formats) {
          const parsed = parse(trimmedDate, fmt, new Date());
          if (isValid(parsed)) {
            date = parsed;
            break;
          }
        }
      } else if (trimmedDate.match(/^\d{4}-\d{2}-\d{2}/)) {
        const parsed = new Date(trimmedDate);
        if (isValid(parsed)) {
          date = parsed;
        }
      }
    } catch (error) {
      logInfo(`Error parseando fecha string: ${trimmedDate}`);
    }
  }

  return date && isValid(date) ? date : null;
}

async function takeSpeProduccionSnapshot() {
  const limaTimeZone = 'America/Lima'
  const nowUTC = new Date()
  const nowInLima = toZonedTime(nowUTC, limaTimeZone)
  const fechaHoy = format(nowInLima, 'yyyy-MM-dd')

  logInfo(`🕐 Hora UTC: ${nowUTC.toISOString()}`)
  logInfo(`🕐 Hora Lima: ${nowInLima.toISOString()}`)
  logInfo(`📅 Fecha calculada para snapshot: ${fechaHoy}`)
  logInfo(`🔍 Iniciando snapshot SPE Producción para fecha: ${fechaHoy}`)

  // 1. Obtener datos desde Google Sheets
  const rows = await getSheetData(SPREADSHEET_ID, SHEET_RANGE)
  if (!rows || rows.length < 2) {
    throw new Error('No se encontraron datos en Google Sheets')
  }

  const header = rows[0].map((h: any) => typeof h === 'string' ? h.trim().toUpperCase() : '')
  const dataRows = rows.slice(1)

  const getIndex = (name: string, fallback: number) => header.indexOf(name) !== -1 ? header.indexOf(name) : fallback
  const COL_EXPEDIENTE = getIndex('EXPEDIENTE', 0)
  const COL_EVALUADOR = getIndex('EVALUADOR', 5)
  const COL_FECHA_TRABAJO = getIndex('FECHA_DE_TRABAJO', 9)
  const COL_ETAPA = getIndex('ETAPA', 6)

  // 2. Filtrar solo expedientes con fecha de trabajo del día actual
  const grupos: Record<string, { fecha: string, evaluador: string, total: number, finalizadas: number, iniciadas: number }> = {};
  let procesados = 0;
  let descartados = 0;

  for (const row of dataRows) {
    const expediente = row[COL_EXPEDIENTE]
    const evaluador = row[COL_EVALUADOR] || 'Sin Asignar'
    const fechaTrabajoRaw = row[COL_FECHA_TRABAJO]
    const etapa = (row[COL_ETAPA] || '').toString().trim().toUpperCase();

    if (!expediente || !fechaTrabajoRaw) { 
      descartados++; 
      continue 
    }

    const fechaTrabajo = safeParseDate(fechaTrabajoRaw);
    if (!fechaTrabajo) { 
      descartados++; 
      continue 
    }

    const fechaStr = format(fechaTrabajo, 'yyyy-MM-dd');
    
    // Solo procesar expedientes con fecha de trabajo del día actual
    if (fechaStr !== fechaHoy) {
      descartados++;
      continue;
    }

    const key = `${evaluador}__${fechaStr}`;
    if (!grupos[key]) {
      grupos[key] = { fecha: fechaStr, evaluador, total: 0, finalizadas: 0, iniciadas: 0 };
    }
    grupos[key].total++;
    if (etapa === 'FINALIZADA') grupos[key].finalizadas++;
    else grupos[key].iniciadas++;
    procesados++;
  }

  logInfo(`📊 Expedientes procesados del día ${fechaHoy}: ${procesados}`)
  logInfo(`📊 Expedientes descartados: ${descartados}`)
  logInfo(`👥 Evaluadores únicos del día: ${Object.keys(grupos).length}`)

  // 3. Eliminar registros existentes del día
  const { db } = await getDrizzleDB({ type: 'direct' })
  
  logInfo(`🗑️ Eliminando registros existentes de producción SPE para fecha ${fechaHoy}...`)
  await db.delete(historicoSpeProduccionAgg).where(eq(historicoSpeProduccionAgg.fecha, fechaHoy))

  // 4. Insertar nuevos registros
  const results = {
    evaluadores: 0,
    totalExpedientes: 0,
    finalizadas: 0,
    iniciadas: 0
  }

  if (Object.keys(grupos).length > 0) {
    for (const key in grupos) {
      const g = grupos[key];
      await db.insert(historicoSpeProduccionAgg).values({
        fecha: g.fecha,
        evaluador: g.evaluador,
        total: g.total,
        finalizadas: g.finalizadas,
        iniciadas: g.iniciadas,
      });
      
      results.evaluadores++;
      results.totalExpedientes += g.total;
      results.finalizadas += g.finalizadas;
      results.iniciadas += g.iniciadas;
    }

    logInfo(`✅ Snapshot SPE Producción creado: ${results.evaluadores} evaluadores, ${results.totalExpedientes} expedientes (${results.finalizadas} finalizadas, ${results.iniciadas} iniciadas)`)
  } else {
    logInfo('⚠️ No se encontraron expedientes del día actual para el snapshot de producción')
  }

  return results
}

export async function POST(request: NextRequest) {
  try {
    // Verificar si es llamada interna desde GitHub Actions
    const authHeader = request.headers.get('Authorization')
    const isInternalCall = authHeader === `Bearer ${process.env.INTERNAL_API_SECRET}`
    
    if (isInternalCall) {
      logInfo('🤖 Snapshot automático SPE Producción invocado desde GitHub Actions')
    } else {
      logInfo('🔑 Snapshot manual SPE Producción invocado por un usuario')
      // TODO: AQUÍ IRÍA LA LÓGICA DE AUTENTICACIÓN DEL USUARIO para llamadas manuales
    }

    const results = await takeSpeProduccionSnapshot()
    
    return NextResponse.json({ 
      success: true, 
      results,
      message: `Snapshot SPE Producción creado exitosamente: ${results.evaluadores} evaluadores, ${results.totalExpedientes} expedientes (${results.finalizadas} finalizadas, ${results.iniciadas} iniciadas)`
    })

  } catch (error) {
    logError('❌ Error tomando el snapshot SPE Producción:', error)
    return NextResponse.json({ 
      success: false, 
      error: (error as Error).message 
    }, { status: 500 })
  }
} 