import { NextResponse } from 'next/server'
import { getSheetData } from '@/lib/google-sheets'
import { cachedOperation } from '@/lib/server-cache'
import { logError, logInfo } from '@/lib/logger'

// Configuración específica para SOL
const SPREADSHEET_ID: string = '1G9HIEiliCgkasTTwdAtoeHB4z9-er2DBboUr91yXsLM'
const SHEET_NAME: string = 'MATRIZ_VISAS' 
const SHEET_RANGE = `${SHEET_NAME}!A:J` // Leemos hasta la columna J (EVALUADOR)

// Estados a excluir según los requerimientos
const ESTADOS_EXCLUIDOS = [
  'PRE APROBADO',
  'PRE DENEGADO', 
  'PRE ABANDONO',
  'PRE NO PRESENTADO',
  'APROBADO',
  'DENEGADO',
  'ANULADO',
  'DESISTIDO',
  'ABANDONO',
  'NO PRESENTADO',
  'PRE DESISTIDO'
];

interface SolPendiente {
  evaluador: string;
  expedientesPorAnio: { [anio: string]: number };
  expedientesPorTrimestre: { [trimestre: string]: number };
  expedientesPorMes: { [mes: string]: number };
  totalGeneral: number;
}

/**
 * Transforma los datos crudos de Google Sheets (array de arrays) a un formato de pendientes agrupados.
 * Para SOL: cuenta EXPEDIENTE (col B) por EVALUADOR (col J) filtrado por ESTADO (col H) y agrupado por FECHA_INGRESO (col C).
 */
function transformDataToPendientes(rows: any[][]): SolPendiente[] {
  if (!rows || rows.length < 2) return [];

  const header = rows[0].map(h => typeof h === 'string' ? h.trim().toUpperCase() : '');
  const dataRows = rows.slice(1);

  // Mapeo de nombres de columna (en mayúsculas) a índices esperados
  const getIndex = (name: string, fallbackIndex: number): number => {
    const index = header.indexOf(name);
    return index !== -1 ? index : fallbackIndex;
  };
  
  const COL_EXPEDIENTE = getIndex('EXPEDIENTE', 1); // Columna B es índice 1
  const COL_FECHA_INGRESO = getIndex('FECHA_INGRESO', 2); // Columna C es índice 2
  const COL_ESTADO = getIndex('ESTADO', 7); // Columna H es índice 7
  const COL_EVALUADOR = getIndex('EVALUADOR', 9); // Columna J es índice 9
  
  logInfo(`Índices de columna SOL resueltos: EXPEDIENTE=${COL_EXPEDIENTE}, FECHA_INGRESO=${COL_FECHA_INGRESO}, ESTADO=${COL_ESTADO}, EVALUADOR=${COL_EVALUADOR}`);

  const pendientesAgrupados = dataRows.reduce((acc, row) => {
    const estadoRaw = (row[COL_ESTADO] || '').toString();
    const estadoClean = estadoRaw.trim().toUpperCase();
    
    // Aplicar filtros SOL: excluir estados específicos
    if (ESTADOS_EXCLUIDOS.includes(estadoClean)) {
      return acc; // Ignorar expedientes con estados excluidos
    }

    const evaluador = row[COL_EVALUADOR] || 'Sin Asignar';
    const expediente = row[COL_EXPEDIENTE];
    const fechaIngreso = row[COL_FECHA_INGRESO];
    
    // Validar que tengamos expediente
    if (!expediente) {
      return acc;
    }
    
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
  }, {} as { [key: string]: SolPendiente });

  return Object.values(pendientesAgrupados).sort((a, b) => b.totalGeneral - a.totalGeneral);
}

export async function GET() {
  const cacheKey = `sol:data:pendientes:v1`; // Clave de caché específica para SOL
  const ttl = 5 * 60; // 5 minutos de caché - sincronizado con frontend

  try {
    // Validación rápida de configuración
    if (SPREADSHEET_ID.length < 10 || SHEET_NAME.length < 3) {
      logError('El ID de la hoja de cálculo de Google o el nombre de la hoja no se han configurado en la API SOL.');
      throw new Error('Configuración de Google Sheets incompleta en el backend SOL.');
    }

    const data = await cachedOperation<SolPendiente[]>({
      key: cacheKey,
      ttlSeconds: ttl,
      fetcher: async () => {
        logInfo('Cache miss. Obteniendo datos frescos de Google Sheets para SOL Pendientes.');
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

    logInfo(`SOL Pendientes procesados: ${data.length} evaluadores, períodos: ${aniosOrdenados.length} años, ${trimestresOrdenados.length} trimestres, ${mesesOrdenados.length} meses`);

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
    logError('Error en el endpoint /api/sol/data:', error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
} 