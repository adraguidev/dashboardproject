import { NextRequest, NextResponse } from 'next/server'
import { getSheetData } from '@/lib/google-sheets'
import { cachedOperation } from '@/lib/server-cache'
import { logError, logInfo } from '@/lib/logger'
import { subDays, isValid, isFuture, isPast, parse } from 'date-fns'

interface FechaErradaItem {
  evaluador: string;
  fechaTrabajoOriginal: string;
  numeroTramite: string;
  razonError: string;
  fechaDeteccion: string;
}

interface RankingFechasErradas {
  evaluador: string;
  totalErrores: number;
  erroresPorTipo: {
    fechaFutura: number;
    fechaInvalida: number;
    fechaMuyAntigua: number;
  };
  ejemplosErrores: FechaErradaItem[];
}

function safeParseDate(dateInput: any): Date | null {
  if (!dateInput) return null;

  let date: Date | null = null;

  // Manejo robusto de fechas de Excel/Sheets (números seriales)
  if (typeof dateInput === 'number' && dateInput > 20000) { 
    try {
      // Excel en Windows cuenta desde 1900-01-01 como día 1, pero tiene un bug que considera 1900 bisiesto.
      // Se ajusta restando 1. Google Sheets usa el mismo epoch que Unix pero en días (25569).
      // Esta fórmula es una aproximación segura para ambos.
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
        // Para formato ISO YYYY-MM-DD, new Date() es suficiente si se maneja la zona horaria.
        // Se asume que la fecha no tiene componente horario.
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

function validarFecha(fechaInput: any, numeroTramite: string, evaluador: string, fechaHoy: Date): FechaErradaItem | null {
  const fechaStr = fechaInput?.toString() || '';
  if (!fechaStr.trim()) {
    return null; // No contar fechas vacías como error
  }

  const fecha = safeParseDate(fechaInput);

  if (!fecha) {
    return {
      evaluador,
      fechaTrabajoOriginal: fechaStr,
      numeroTramite,
      razonError: 'Formato de fecha inválido',
      fechaDeteccion: fechaHoy.toISOString().split('T')[0]
    };
  }

  // Verificar si la fecha es futura
  if (isFuture(fecha)) {
    return {
      evaluador,
      fechaTrabajoOriginal: fechaStr,
      numeroTramite,
      razonError: 'Fecha futura',
      fechaDeteccion: fechaHoy.toISOString().split('T')[0]
    };
  }

  // Verificar si la fecha es muy antigua (más de 1 año)
  const fechaLimite = subDays(fechaHoy, 365);
  if (isPast(fecha) && fecha < fechaLimite) {
    return {
      evaluador,
      fechaTrabajoOriginal: fechaStr,
      numeroTramite,
      razonError: 'Fecha muy antigua (>1 año)',
      fechaDeteccion: fechaHoy.toISOString().split('T')[0]
    };
  }

  return null; // Fecha válida
}

const SPREADSHEET_ID = '1_rNxpAUIepZdp_lGkndR_pTGuZ0hr6kBI4lEtt27km0'
const SHEET_NAME = 'MATRIZ'

async function getFechasErradasFromSheets(): Promise<RankingFechasErradas[]> {
  logInfo('Analizando fechas erróneas en Google Sheets SPE');
  
  // Obtener datos de la hoja de producción SPE
  const range = `${SHEET_NAME}!A:L`; // Ajustar según el rango real
  const data = await getSheetData(SPREADSHEET_ID, range);
  
  if (!data || data.length <= 1) {
    logInfo('No hay datos en Google Sheets SPE o solo headers');
    return [];
  }

  const headers = data[0];
  const rows = data.slice(1);
  
  // Encontrar índices de las columnas necesarias
  const evaluadorIndex = headers.findIndex((h: any) => h?.toLowerCase().includes('evaluador'));
  const fechaTrabajoIndex = headers.findIndex((h: any) => h?.toLowerCase().includes('fecha_de_trabajo') || h?.toLowerCase().includes('fecha trabajo'));
  const numeroTramiteIndex = headers.findIndex((h: any) => h?.toLowerCase().includes('numero') && h?.toLowerCase().includes('tramite'));
  
  if (evaluadorIndex === -1 || fechaTrabajoIndex === -1) {
    throw new Error('No se encontraron las columnas necesarias en Google Sheets');
  }

  logInfo(`Columnas encontradas - Evaluador: ${evaluadorIndex}, Fecha Trabajo: ${fechaTrabajoIndex}, Número Trámite: ${numeroTramiteIndex}`);

  const fechaHoy = new Date();
  const fecha60DiasAtras = subDays(fechaHoy, 60);
  const erroresDetectados: FechaErradaItem[] = [];

  // Analizar cada fila
  rows.forEach((row: any[], index: number) => {
    const evaluador = row[evaluadorIndex]?.toString().trim();
    const fechaTrabajoInput = row[fechaTrabajoIndex];
    const numeroTramite = numeroTramiteIndex >= 0 ? row[numeroTramiteIndex]?.toString().trim() : `Fila ${index + 2}`;

    if (!evaluador) return;

    const fechaParseada = safeParseDate(fechaTrabajoInput);

    // Si la fecha es inválida (typo), es un error que siempre se debe reportar.
    if (!fechaParseada) {
      const error = validarFecha(fechaTrabajoInput, numeroTramite || `Fila ${index + 2}`, evaluador, fechaHoy);
      if (error) {
        erroresDetectados.push(error);
      }
      return; // Continuar con la siguiente fila
    }

    // Si la fecha es válida, solo la analizamos si es de los últimos 60 días.
    if (fechaParseada >= fecha60DiasAtras) {
      const error = validarFecha(fechaTrabajoInput, numeroTramite || `Fila ${index + 2}`, evaluador, fechaHoy);
      if (error) {
        erroresDetectados.push(error);
      }
    }
  });

  logInfo(`Errores de fecha detectados en últimos 60 días: ${erroresDetectados.length}`);

  // Agrupar por evaluador y crear ranking
  const agrupados: { [evaluador: string]: FechaErradaItem[] } = {};
  erroresDetectados.forEach(error => {
    if (!agrupados[error.evaluador]) {
      agrupados[error.evaluador] = [];
    }
    agrupados[error.evaluador].push(error);
  });

  const ranking: RankingFechasErradas[] = Object.entries(agrupados).map(([evaluador, errores]) => {
    const erroresPorTipo = {
      fechaFutura: errores.filter(e => e.razonError === 'Fecha futura').length,
      fechaInvalida: errores.filter(e => e.razonError.includes('inválido') || e.razonError.includes('parsear') || e.razonError.includes('vacía')).length,
      fechaMuyAntigua: errores.filter(e => e.razonError === 'Fecha muy antigua (>1 año)').length,
    };

    return {
      evaluador,
      totalErrores: errores.length,
      erroresPorTipo,
      ejemplosErrores: errores.slice(0, 5) // Mostrar solo los primeros 5 ejemplos
    };
  });

  // Ordenar por total de errores (descendente)
  ranking.sort((a, b) => b.totalErrores - a.totalErrores);

  logInfo(`Ranking generado con ${ranking.length} evaluadores con errores`);
  
  return ranking;
}

export async function GET(request: NextRequest) {
  const cacheKey = `spe:fechas-erradas:v1`;
  const ttl = 10 * 60; // 10 minutos de caché

  try {
    const data = await cachedOperation<RankingFechasErradas[]>({
      key: cacheKey,
      ttlSeconds: ttl,
      fetcher: getFechasErradasFromSheets,
      validator: (data) => Array.isArray(data),
    });

    return NextResponse.json({ 
      success: true, 
      data,
      metadata: {
        totalEvaluadoresConErrores: data.length,
        totalErroresDetectados: data.reduce((sum, item) => sum + item.totalErrores, 0),
        fechaAnalisis: new Date().toISOString().split('T')[0],
        periodoAnalisis: 'últimos 60 días'
      }
    });

  } catch (error) {
    logError('Error en el endpoint /api/spe/fechas-erradas:', error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
} 