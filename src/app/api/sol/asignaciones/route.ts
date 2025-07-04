import { NextRequest, NextResponse } from 'next/server'
import { getSheetData } from '@/lib/google-sheets'
import { cachedOperation } from '@/lib/server-cache'
import { logError, logInfo } from '@/lib/logger'
import { subDays, isValid, parse } from 'date-fns'

const SPREADSHEET_ID = '1G9HIEiliCgkasTTwdAtoeHB4z9-er2DBboUr91yXsLM';
const SHEET_NAME = 'MATRIZ_VISAS';
// Columnas: B:EXPEDIENTE, C:FECHA_ASIGNACION, G:CALIDAD, J:EVALUADOR
const SHEET_RANGE = `${SHEET_NAME}!B:J` 

interface AsignacionItem {
  evaluador: string;
  asignacionesPorProceso: { [proceso: string]: number };
  totalAsignaciones: number;
}

// Usamos la misma función robusta para parsear fechas
function safeParseDate(dateInput: any): Date | null {
  if (!dateInput) return null;
  let date: Date | null = null;
  if (typeof dateInput === 'number' && dateInput > 20000) {
    try {
      const excelEpoch = new Date(1900, 0, dateInput - 1);
      if (isValid(excelEpoch)) date = excelEpoch;
    } catch (e) {}
  } else if (typeof dateInput === 'string') {
    const trimmed = dateInput.trim();
    if (trimmed.length < 6) return null;
    const formats = ['d/M/yyyy', 'dd/MM/yyyy', 'M/d/yyyy', 'MM/dd/yyyy', 'yyyy-MM-dd'];
    for (const fmt of formats) {
      const parsed = parse(trimmed, fmt, new Date());
      if (isValid(parsed)) {
        date = parsed;
        break;
      }
    }
  }
  return date && isValid(date) ? date : null;
}

async function getAsignacionesData(days: number): Promise<{ data: AsignacionItem[], procesos: string[] }> {
  logInfo(`Obteniendo datos de asignaciones SOL para los últimos ${days} días.`);
  
  const data = await getSheetData(SPREADSHEET_ID, SHEET_RANGE);
  
  if (!data || data.length <= 1) {
    logInfo('No hay datos de asignaciones en Google Sheets SOL.');
    return { data: [], procesos: [] };
  }

  const headers = data[0].map((h: any) => h?.toString().trim().toUpperCase() || '');
  const rows = data.slice(1);
  
  const evaluadorIndex = headers.indexOf('EVALUADOR');
  const fechaAsignacionIndex = headers.indexOf('FECHA_ASIGNACION');
  const calidadIndex = headers.indexOf('CALIDAD');
  const expedienteIndex = headers.indexOf('EXPEDIENTE');

  if ([evaluadorIndex, fechaAsignacionIndex, calidadIndex, expedienteIndex].includes(-1)) {
    logError(`Columnas no encontradas: EVALUADOR=${evaluadorIndex}, FECHA_ASIGNACION=${fechaAsignacionIndex}, CALIDAD=${calidadIndex}, EXPEDIENTE=${expedienteIndex}`);
    throw new Error('No se encontraron todas las columnas necesarias en Google Sheets para Asignaciones.');
  }
  
  const fechaLimite = subDays(new Date(), days);
  const asignacionesAgrupadas: { [evaluador: string]: { [proceso: string]: number } } = {};
  const procesosUnicos = new Set<string>();

  rows.forEach(row => {
    const fechaAsignacionRaw = row[fechaAsignacionIndex];
    const fechaAsignacion = safeParseDate(fechaAsignacionRaw);
    
    if (!fechaAsignacion || fechaAsignacion < fechaLimite) {
      return; // Ignorar si la fecha es inválida o muy antigua
    }

    const evaluador = row[evaluadorIndex]?.toString().trim();
    const calidad = row[calidadIndex]?.toString().trim();
    const expediente = row[expedienteIndex]?.toString().trim();

    if (!evaluador || !calidad || !expediente) {
      return; // Ignorar filas sin datos esenciales
    }

    if (!asignacionesAgrupadas[evaluador]) {
      asignacionesAgrupadas[evaluador] = {};
    }
    if (!asignacionesAgrupadas[evaluador][calidad]) {
      asignacionesAgrupadas[evaluador][calidad] = 0;
    }
    asignacionesAgrupadas[evaluador][calidad]++;
    procesosUnicos.add(calidad);
  });

  const resultadoFinal: AsignacionItem[] = Object.entries(asignacionesAgrupadas).map(([evaluador, asignaciones]) => {
    const totalAsignaciones = Object.values(asignaciones).reduce((sum, count) => sum + count, 0);
    return {
      evaluador,
      asignacionesPorProceso: asignaciones,
      totalAsignaciones
    };
  }).sort((a, b) => b.totalAsignaciones - a.totalAsignaciones);
  
  logInfo(`Asignaciones procesadas: ${resultadoFinal.length} evaluadores, ${procesosUnicos.size} calidades.`);
  return { data: resultadoFinal, procesos: Array.from(procesosUnicos).sort() };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const days = parseInt(searchParams.get('days') || '30', 10);

  if (isNaN(days) || days <= 0) {
    return NextResponse.json({ success: false, error: "Parámetro 'days' debe ser un número positivo." }, { status: 400 });
  }

  const cacheKey = `sol:asignaciones:${days}d:v1`;
  const ttl = 10 * 60; // 10 minutos de caché

  try {
    const { data, procesos } = await cachedOperation<{ data: AsignacionItem[], procesos: string[] }>({
      key: cacheKey,
      ttlSeconds: ttl,
      fetcher: () => getAsignacionesData(days),
    });

    return NextResponse.json({ 
      success: true, 
      data,
      metadata: {
        procesos,
        periodoAnalisis: `${days} días`
      }
    });

  } catch (error) {
    logError('Error en el endpoint /api/sol/asignaciones:', error);
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}