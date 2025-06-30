import { NextResponse } from 'next/server'
import { getSheetData } from '@/lib/google-sheets'
import { cachedOperation } from '@/lib/server-cache'
import { logError, logInfo } from '@/lib/logger'

// --- MARCADORES DE POSICIÓN ---
// POR FAVOR, REEMPLAZA ESTOS VALORES CON LOS DE TU GOOGLE SHEET
const SPREADSHEET_ID: string = '1_rNxpAUIepZdp_lGkndR_pTGuZ0hr6kBI4lEtt27km0'
const SHEET_NAME: string = 'MATRIZ' 
// -----------------------------

const SHEET_RANGE = `${SHEET_NAME}!A:G` // Leemos hasta la columna G (ETAPA)

interface SpePendiente {
  evaluador: string;
  expedientesPorAnio: { [anio: string]: number };
  expedientesPorTrimestre: { [trimestre: string]: number };
  expedientesPorMes: { [mes: string]: number };
  totalGeneral: number;
}

/**
 * Transforma los datos crudos de Google Sheets (array de arrays) a un formato de pendientes agrupados.
 * Es robusto ante cambios en los nombres de las columnas, usando índices como fallback.
 */
function transformDataToPendientes(rows: any[][]): SpePendiente[] {
  if (!rows || rows.length < 2) return [];

  const header = rows[0].map(h => typeof h === 'string' ? h.trim().toUpperCase() : '');
  const dataRows = rows.slice(1);

  // Mapeo de nombres de columna (en mayúsculas) a índices esperados
  const getIndex = (name: string, fallbackIndex: number): number => {
    const index = header.indexOf(name);
    return index !== -1 ? index : fallbackIndex;
  };
  
  const COL_EVALUADOR = getIndex('EVALUADOR', 5); // Columna 6 es índice 5
  const COL_EXPEDIENTE = getIndex('EXPEDIENTE', 1); // Columna 2 es índice 1
  const COL_ETAPA = getIndex('ETAPA', 6); // Columna 7 es índice 6
  const COL_FECHA_INGRESO = getIndex('FECHA_INGRESO', 2); // Columna 3 es índice 2
  
  logInfo(`Índices de columna resueltos: EVALUADOR=${COL_EVALUADOR}, EXPEDIENTE=${COL_EXPEDIENTE}, ETAPA=${COL_ETAPA}, FECHA_INGRESO=${COL_FECHA_INGRESO}`);

  const pendientesAgrupados = dataRows.reduce((acc, row) => {
    const etapa = row[COL_ETAPA] || '';
    if (etapa.trim().toUpperCase() !== 'INICIADA') {
      return acc; // Ignorar si la etapa no es 'INICIADA'
    }

    const evaluador = row[COL_EVALUADOR] || 'Sin Asignar';
    const fechaIngreso = row[COL_FECHA_INGRESO];
    
    // Validar y parsear el año. Acepta fechas de Sheets (números) o strings (DD/MM/YYYY)
    let anio: number | null = null;
    let mes: number | null = null; // 0-11
    if (typeof fechaIngreso === 'number' && fechaIngreso > 20000) { // Probablemente fecha de Excel/Sheets
      const date = new Date(1900, 0, fechaIngreso - 1)
      anio = date.getFullYear();
      mes = date.getMonth();
    } else if (typeof fechaIngreso === 'string' && fechaIngreso.includes('/')) {
      const parts = fechaIngreso.split('/');
      if (parts.length === 3) {
        anio = parseInt(parts[2], 10);
        mes = parseInt(parts[1], 10) - 1; // JS months son 0-indexed
      }
    }

    if (!anio || isNaN(anio) || mes === null || isNaN(mes)) {
      return acc; // Ignorar si no podemos determinar el año o mes
    }

    const anioStr = anio.toString();
    const trimestre = `${anio}-T${Math.floor(mes / 3) + 1}`;
    const mesStr = `${anio}-${(mes + 1).toString().padStart(2, '0')}`; // Formato YYYY-MM

    if (!acc[evaluador]) {
      acc[evaluador] = {
        evaluador: evaluador,
        expedientesPorAnio: {},
        expedientesPorTrimestre: {},
        expedientesPorMes: {},
        totalGeneral: 0,
      };
    }

    acc[evaluador].expedientesPorAnio[anioStr] = (acc[evaluador].expedientesPorAnio[anioStr] || 0) + 1;
    acc[evaluador].expedientesPorTrimestre[trimestre] = (acc[evaluador].expedientesPorTrimestre[trimestre] || 0) + 1;
    acc[evaluador].expedientesPorMes[mesStr] = (acc[evaluador].expedientesPorMes[mesStr] || 0) + 1;
    acc[evaluador].totalGeneral++;
    
    return acc;
  }, {} as { [key: string]: SpePendiente });

  return Object.values(pendientesAgrupados).sort((a, b) => b.totalGeneral - a.totalGeneral);
}

export async function GET() {
  const cacheKey = `spe:data:pendientes:v2`; // Clave de caché específica
  const ttl = 15 * 60; // 15 minutos de caché

  try {
    // Validación rápida en caso de que alguien olvide configurar las constantes.
    if (SPREADSHEET_ID.startsWith('TU_') || SHEET_NAME.startsWith('TU_')) {
      logError('El ID de la hoja de cálculo de Google o el nombre de la hoja no se han configurado en la API.');
      throw new Error('Configuración de Google Sheets incompleta en el backend.');
    }

    const data = await cachedOperation<SpePendiente[]>({
      key: cacheKey,
      ttlSeconds: ttl,
      fetcher: async () => {
        logInfo('Cache miss. Obteniendo datos frescos de Google Sheets para SPE Pendientes.');
        const rawData = await getSheetData(SPREADSHEET_ID, SHEET_RANGE);
        return transformDataToPendientes(rawData);
      },
      validator: (data) => Array.isArray(data), // Permitir caché de array vacío
    });

    // Añadir metadatos para la UI (lista de todos los años encontrados)
    const todosLosAnios = new Set<string>();
    const todosLosTrimestres = new Set<string>();
    const todosLosMeses = new Set<string>();

    data.forEach(item => {
      Object.keys(item.expedientesPorAnio).forEach(anio => todosLosAnios.add(anio));
      Object.keys(item.expedientesPorTrimestre).forEach(trimestre => todosLosTrimestres.add(trimestre));
      Object.keys(item.expedientesPorMes).forEach(mes => todosLosMeses.add(mes));
    });

    const aniosOrdenados = Array.from(todosLosAnios).sort();
    const trimestresOrdenados = Array.from(todosLosTrimestres).sort();
    const mesesOrdenados = Array.from(todosLosMeses).sort();

    return NextResponse.json({ 
      success: true, 
      data, 
      periodos: {
        anios: aniosOrdenados,
        trimestres: trimestresOrdenados,
        meses: mesesOrdenados,
      }
    });

  } catch (error) {
    logError('Error en el endpoint /api/spe/data:', error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
} 