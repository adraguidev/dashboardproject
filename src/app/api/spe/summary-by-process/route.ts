import { NextRequest, NextResponse } from 'next/server'
import { getSheetData } from '@/lib/google-sheets'
import { cachedOperation } from '@/lib/server-cache'
import { logError, logInfo } from '@/lib/logger'

const SPREADSHEET_ID: string = '1_rNxpAUIepZdp_lGkndR_pTGuZ0hr6kBI4lEtt27km0'
const SHEET_NAME: string = 'MATRIZ'
const SHEET_RANGE = `${SHEET_NAME}!A:H` // Leemos hasta la columna ESTADO

interface ProcessSummary {
  proceso: string
  estado: string
  anio: string
  trimestre: string
  mes: string
  total: number
}

export async function GET(request: NextRequest) {
  const cacheKey = `spe:summary:by_process:v1`
  const ttl = 10 * 60 // 10 minutos

  try {
    const data = await cachedOperation<ProcessSummary[]>({
      key: cacheKey,
      ttlSeconds: ttl,
      fetcher: async () => {
        logInfo('Cache miss. Generando resumen por proceso para SPE.')
        const rows = await getSheetData(SPREADSHEET_ID, SHEET_RANGE)
        if (!rows || rows.length < 2) return []

        const header = rows[0].map(h => (typeof h === 'string' ? h.trim().toUpperCase() : ''))
        const getIdx = (name: string, fallback: number) => {
          const i = header.indexOf(name)
          return i !== -1 ? i : fallback
        }
        
        const COL_ETAPA = getIdx('ETAPA', 6)
        const COL_PROCESO = getIdx('PROCESO', 3)
        const COL_ESTADO = getIdx('ESTADO', 7)
        const COL_FECHA_INGRESO = getIdx('FECHA_INGRESO', 2)

        const aggregation: { [key: string]: ProcessSummary } = {}

        rows.slice(1).forEach(row => {
          const etapaRaw = (row[COL_ETAPA] || '').toString().trim().toUpperCase()
          if (etapaRaw !== 'INICIADA' && etapaRaw !== '') return

          const proceso = (row[COL_PROCESO] || 'SIN PROCESO').toString().trim()
          const estado = (row[COL_ESTADO] || 'SIN ESTADO').toString().trim()

          let anio: number | null = null
          let mes: number | null = null
          const fechaIngreso = row[COL_FECHA_INGRESO]

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

          const key = `${proceso}|${estado}|${anioStr}|${trimestreStr}|${mesStr}`

          if (!aggregation[key]) {
            aggregation[key] = {
              proceso,
              estado,
              anio: anioStr,
              trimestre: trimestreStr,
              mes: mesStr,
              total: 0,
            }
          }
          aggregation[key].total++
        })
        return Object.values(aggregation)
      },
      validator: data => Array.isArray(data)
    })
    return NextResponse.json({ success: true, data })
  } catch (err) {
    logError('Error en /api/spe/summary-by-process', err)
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 })
  }
} 