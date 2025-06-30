import { NextRequest, NextResponse } from 'next/server'
import { getSheetData } from '@/lib/google-sheets'
import { cachedOperation } from '@/lib/server-cache'
import { logError, logInfo } from '@/lib/logger'

const SPREADSHEET_ID: string = '1_rNxpAUIepZdp_lGkndR_pTGuZ0hr6kBI4lEtt27km0'
const SHEET_NAME: string = 'MATRIZ'
const SHEET_RANGE = `${SHEET_NAME}!A:H` // hasta columna 8 (ESTADO)

interface ProcesoDetalle {
  proceso: string;
  total: number;
  estados: { [estado: string]: number };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const evaluadorParam = (searchParams.get('evaluador') || '').trim()
  if (!evaluadorParam) {
    return NextResponse.json({ success: false, error: 'Parámetro evaluador requerido.' }, { status: 400 })
  }

  const cacheKey = `spe:detail:${encodeURIComponent(evaluadorParam)}`
  const ttl = 10 * 60 // 10 minutos
  try {
    const resultado = await cachedOperation<ProcesoDetalle[]>({
      key: cacheKey,
      ttlSeconds: ttl,
      fetcher: async () => {
        logInfo(`Generando detalle para SPE - Evaluador: ${evaluadorParam}`)
        const rows = await getSheetData(SPREADSHEET_ID, SHEET_RANGE)
        if (!rows || rows.length < 2) return []
        const header = rows[0].map(h => typeof h === 'string' ? h.trim().toUpperCase() : '')
        const getIdx = (name: string, fallback: number) => {
          const i = header.indexOf(name)
          return i !== -1 ? i : fallback
        }
        const COL_EVALUADOR = getIdx('EVALUADOR', 5)
        const COL_ETAPA = getIdx('ETAPA', 6)
        const COL_PROCESO = getIdx('PROCESO', 3)
        const COL_ESTADO = getIdx('ESTADO', 7)

        const detalleMap: { [proceso: string]: ProcesoDetalle } = {}
        rows.slice(1).forEach(row => {
          const etapaRaw = (row[COL_ETAPA] || '').toString().trim().toUpperCase()
          if (etapaRaw !== 'INICIADA' && etapaRaw !== '') return
          const ev = (row[COL_EVALUADOR] || '').toString().trim()
          if (ev !== evaluadorParam) return
          const proceso = (row[COL_PROCESO] || 'SIN PROCESO').toString().trim()
          const estado = (row[COL_ESTADO] || 'SIN ESTADO').toString().trim()
          if (!detalleMap[proceso]) {
            detalleMap[proceso] = { proceso, total: 0, estados: {} }
          }
          detalleMap[proceso].total++
          detalleMap[proceso].estados[estado] = (detalleMap[proceso].estados[estado] || 0) + 1
        })
        return Object.values(detalleMap).sort((a,b)=>b.total-a.total)
      },
      validator: data => Array.isArray(data)
    })

    return NextResponse.json({ success: true, data: resultado })
  } catch (err) {
    logError('Error en /api/spe/detail', err)
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 })
  }
} 