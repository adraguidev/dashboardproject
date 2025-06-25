import { NextRequest, NextResponse } from 'next/server'
import { neonDB } from '@/lib/neon-api'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const process = searchParams.get('process') // 'ccm' o 'prr'
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    const page = parseInt(searchParams.get('page') || '1')

    console.log(`🔍 Obteniendo datos de pendientes para proceso: ${process}`)

    if (!process || (process !== 'ccm' && process !== 'prr')) {
      return NextResponse.json(
        { error: 'Parámetro "process" requerido. Debe ser "ccm" o "prr"' },
        { status: 400 }
      )
    }

    const actualOffset = (page - 1) * limit

    let data: any[] = []
    let totalCount = 0

    if (process === 'ccm') {
      console.log('📊 Obteniendo datos CCM con filtros de pendientes...')
      const [ccmData, ccmCount] = await Promise.all([
        neonDB.getCCMPendientes(limit, actualOffset),
        neonDB.countCCMPendientes()
      ])
      data = ccmData
      totalCount = ccmCount
    } else {
      console.log('📊 Obteniendo datos PRR con filtros de pendientes...')
      const [prrData, prrCount] = await Promise.all([
        neonDB.getPRRPendientes(limit, actualOffset),
        neonDB.countPRRPendientes()
      ])
      data = prrData
      totalCount = prrCount
    }

    console.log(`✅ Datos obtenidos: ${data.length} registros, ${totalCount} total`)

    return NextResponse.json({
      success: true,
      data,
      pagination: {
        page,
        limit,
        offset: actualOffset,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
        hasNextPage: (page * limit) < totalCount,
        hasPrevPage: page > 1
      },
      filters: process === 'ccm' ? {
        ultimaetapa: ['EVALUACIÓN - I'],
        estadopre: [''],
        estadotramite: ['PENDIENTE']
      } : {
        ultimaetapa: [
          'ACTUALIZAR DATOS BENEFICIARIO - F',
          'ACTUALIZAR DATOS BENEFICIARIO - I',
          'ASOCIACION BENEFICIARIO - F',
          'ASOCIACION BENEFICIARIO - I',
          'CONFORMIDAD SUB-DIREC.INMGRA. - I',
          'PAGOS, FECHA Y NRO RD. - F',
          'PAGOS, FECHA Y NRO RD. - I',
          'RECEPCIÓN DINM - F'
        ],
        estadopre: [''],
        estadotramite: ['PENDIENTE']
      }
    })

  } catch (error) {
    console.error('❌ Error en API de pendientes:', error)
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Error interno del servidor',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    )
  }
} 
 
 