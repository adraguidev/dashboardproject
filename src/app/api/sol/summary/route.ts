import { NextRequest, NextResponse } from 'next/server'
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

interface EstadoSummary {
  estado: string
  anio: string
  trimestre: string
  mes: string
  total: number
}

export async function GET(request: NextRequest) {
  const cacheKey = `sol:summary:by_estado:v1`
  const ttl = 10 * 60 // 10 minutos

  try {
    const data = await cachedOperation<EstadoSummary[]>({
      key: cacheKey,
      ttlSeconds: ttl,
      fetcher: async () => {
        logInfo('Cache miss. Generando resumen por estado para SOL.')
        const rows = await getSheetData(SPREADSHEET_ID, SHEET_RANGE)
        if (!rows || rows.length < 2) return []

        const header = rows[0].map(h => (typeof h === 'string' ? h.trim().toUpperCase() : ''))
        const getIdx = (name: string, fallback: number) => {
          const i = header.indexOf(name)
          return i !== -1 ? i : fallback
        }
        
        const COL_EXPEDIENTE = getIdx('EXPEDIENTE', 1) // Columna B es índice 1
        const COL_FECHA_INGRESO = getIdx('FECHA_INGRESO', 2) // Columna C es índice 2
        const COL_ESTADO = getIdx('ESTADO', 7) // Columna H es índice 7
        const COL_EVALUADOR = getIdx('EVALUADOR', 9) // Columna J es índice 9

        logInfo(`Índices SOL Summary: EXPEDIENTE=${COL_EXPEDIENTE}, FECHA_INGRESO=${COL_FECHA_INGRESO}, ESTADO=${COL_ESTADO}, EVALUADOR=${COL_EVALUADOR}`)

        const aggregation: { [key: string]: EstadoSummary } = {}

        rows.slice(1).forEach(row => {
          const estadoRaw = (row[COL_ESTADO] || '').toString()
          const estadoClean = estadoRaw.trim().toUpperCase()
          
          // Aplicar filtros SOL: excluir estados específicos
          if (ESTADOS_EXCLUIDOS.includes(estadoClean)) {
            return // Ignorar expedientes con estados excluidos
          }

          const expediente = row[COL_EXPEDIENTE]
          const fechaIngreso = row[COL_FECHA_INGRESO]
          
          // Validar que tengamos expediente
          if (!expediente) {
            return
          }

          // Para el resumen, usamos el estado limpio o "SIN ESTADO" si está vacío
          const estado = estadoClean || 'SIN ESTADO'

          // Validar y parsear el año y mes
          let anio: number | null = null
          let mes: number | null = null

          if (typeof fechaIngreso === 'number' && fechaIngreso > 20000) {
            const date = new Date(1900, 0, fechaIngreso - 1)
            anio = date.getFullYear()
            mes = date.getMonth()
          } else if (typeof fechaIngreso === 'string' && fechaIngreso.includes('/')) {
            const parts = fechaIngreso.split('/')
            if (parts.length === 3) {
              anio = parseInt(parts[2], 10)
              mes = parseInt(parts[1], 10) - 1
            }
          }

          if (!anio || isNaN(anio) || mes === null || isNaN(mes)) return

          const anioStr = anio.toString()
          const trimestreStr = `${anio}-T${Math.floor(mes / 3) + 1}`
          const mesStr = `${anio}-${(mes + 1).toString().padStart(2, '0')}`

          // Clave única: estado|año|trimestre|mes
          const key = `${estado}|${anioStr}|${trimestreStr}|${mesStr}`

          if (!aggregation[key]) {
            aggregation[key] = {
              estado,
              anio: anioStr,
              trimestre: trimestreStr,
              mes: mesStr,
              total: 0,
            }
          }
          aggregation[key].total++
        })

        const result = Object.values(aggregation)
        logInfo(`SOL Summary procesado: ${result.length} registros agregados`)
        return result
      },
      validator: data => Array.isArray(data)
    })

    return NextResponse.json({ success: true, data })
  } catch (err) {
    logError('Error en /api/sol/summary', err)
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 })
  }
} 