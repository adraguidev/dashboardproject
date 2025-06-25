import { NextResponse } from 'next/server'
import { getRedis } from '@/lib/redis'

export async function POST() {
  try {
    const client = await getRedis()
    await client.flushAll()
    return NextResponse.json({ success: true, message: 'Cache limpiado' })
  } catch (e) {
    return NextResponse.json({ success: false, error: 'Error limpiando cache', details: (e as Error).message }, { status: 500 })
  }
}

export const runtime = 'nodejs' 