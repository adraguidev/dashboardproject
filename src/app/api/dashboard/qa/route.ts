import { NextRequest, NextResponse } from 'next/server'
import { redisGet } from '@/lib/redis'
import { getGemini } from '@/lib/gemini'

export async function POST(request: NextRequest) {
  try {
    const { question, process = 'ccm' } = await request.json()
    if (!question) {
      return NextResponse.json({ error: 'Parámetro "question" requerido' }, { status: 400 })
    }
    // Obtener datos cacheados
    const [ingresos, produccion, pendientes] = await Promise.all([
      redisGet(`ingresos_${process}_30`),
      redisGet(`produccion_${process}_20_TODOS`),
      redisGet(`pendientes_${process}_year`)
    ])

    const contextParts = [
      ingresos && `Ingresos últimos 30 días: total ${ingresos.totalTramites}`,
      produccion && `Producción últimos 20 días: total ${produccion.grandTotal}`,
      pendientes && `Pendientes: total ${pendientes.grandTotal}`
    ].filter(Boolean)

    const prompt = `Eres un asistente que responde preguntas sobre KPIs de trámites de inmigración. Dispones del siguiente resumen:\n${contextParts.join('\n')}\nPregunta: ${question}\nRespuesta breve:`

    const genAI = getGemini()
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
    const result = await model.generateContent(prompt)
    const answer = result.response.text()
    return NextResponse.json({ success: true, answer })
  } catch (e) {
    console.error('QA error', e)
    return NextResponse.json({ success: false, error: (e as Error).message }, { status: 500 })
  }
}

export const runtime = 'nodejs' 