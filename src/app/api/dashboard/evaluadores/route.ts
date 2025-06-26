import { NextRequest, NextResponse } from 'next/server'
import postgresAPI from '@/lib/postgres-api'
import { logInfo, logError } from '@/lib/logger'

// Clase para acceder al caché en memoria (mismo que en server-cache.ts)
class MemoryCache {
  private static instance: MemoryCache;
  private cache: Map<string, any> = new Map();
  
  private constructor() {}
  
  public static getInstance(): MemoryCache {
    if (!MemoryCache.instance) {
      MemoryCache.instance = new MemoryCache();
    }
    return MemoryCache.instance;
  }
  
  async del(key: string): Promise<void> {
    this.cache.delete(key);
  }
}

const memoryCache = MemoryCache.getInstance();

// GET - Obtener evaluadores usando PostgreSQL directo
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const process = searchParams.get('process') || 'ccm'
    
    if (!['ccm', 'prr'].includes(process)) {
      return NextResponse.json({ error: 'Proceso inválido. Debe ser ccm o prr' }, { status: 400 })
    }

    logInfo(`🔍 Obteniendo evaluadores para proceso: ${process.toUpperCase()}`);
    
    const evaluadores = await postgresAPI.getEvaluadoresGestion(process as 'ccm' | 'prr');
    
    logInfo(`✅ Evaluadores obtenidos: ${evaluadores.length} registros`);
    return NextResponse.json(evaluadores);
    
  } catch (error) {
    logError('❌ Error obteniendo evaluadores:', error);
    
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// POST - Crear nuevo evaluador
export async function POST(request: NextRequest) {
  try {
    logInfo('➕ Creando nuevo evaluador con PostgreSQL directo');
    
    const { searchParams } = new URL(request.url)
    const process = searchParams.get('process') || 'ccm'
    
    if (!['ccm', 'prr'].includes(process)) {
      return NextResponse.json({ error: 'Proceso inválido. Debe ser ccm o prr' }, { status: 400 })
    }

    const data = await request.json()
    const { nombre_en_base, nombres_apellidos, regimen, turno, modalidad, sub_equipo } = data
    
    if (!nombre_en_base || !nombres_apellidos) {
      return NextResponse.json({ error: 'Nombre en base y nombres y apellidos son requeridos' }, { status: 400 })
    }

    const result = await postgresAPI.createEvaluador(process as 'ccm' | 'prr', {
      nombre_en_base,
      nombres_apellidos,
      regimen,
      turno,
      modalidad,
      sub_equipo
    });
    
    // Invalidar caché
    const cacheKey = `evaluadores_general_${process}`
    await memoryCache.del(cacheKey)
    logInfo(`🧹 Caché en memoria invalidado para: ${cacheKey}`);

    logInfo('✅ Evaluador creado exitosamente');
    return NextResponse.json(result, { status: 201 });
    
  } catch (error) {
    logError('❌ Error creando evaluador:', error);
    
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// PUT - Actualizar evaluador
export async function PUT(request: NextRequest) {
  try {
    logInfo('🔄 Actualizando evaluador con PostgreSQL directo');
    
    const { searchParams } = new URL(request.url)
    const process = searchParams.get('process')
    const id = searchParams.get('id')
    
    if (!process || !['ccm', 'prr'].includes(process)) {
      return NextResponse.json({ error: 'Proceso inválido. Debe ser ccm o prr' }, { status: 400 })
    }
    
    if (!id) {
      return NextResponse.json({ error: 'ID del evaluador es requerido' }, { status: 400 })
    }

    const data = await request.json()
    const { 
      nombres_apellidos, 
      nombre_en_base, 
      regimen, 
      turno, 
      modalidad, 
      sub_equipo 
    } = data

    const result = await postgresAPI.updateEvaluador(process as 'ccm' | 'prr', parseInt(id), {
      nombre_en_base,
      nombres_apellidos,
      regimen,
      turno,
      modalidad,
      sub_equipo
    });
    
    // Invalidar caché
    const cacheKey = `evaluadores_general_${process}`
    await memoryCache.del(cacheKey)
    logInfo(`🧹 Caché en memoria invalidado para: ${cacheKey}`);

    logInfo('✅ Evaluador actualizado exitosamente');
    return NextResponse.json(result);
    
  } catch (error) {
    logError('❌ Error actualizando evaluador:', error);
    
    if ((error as any)?.message?.includes('no encontrado')) {
      return NextResponse.json({ error: 'Evaluador no encontrado' }, { status: 404 })
    }
    
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// DELETE - Eliminar evaluador
export async function DELETE(request: NextRequest) {
  try {
    logInfo('🗑️ Eliminando evaluador con PostgreSQL directo');
    
    const { searchParams } = new URL(request.url)
    const process = searchParams.get('process')
    const id = searchParams.get('id')
    
    if (!process || !['ccm', 'prr'].includes(process)) {
      return NextResponse.json({ error: 'Proceso inválido. Debe ser ccm o prr' }, { status: 400 })
    }
    
    if (!id) {
      return NextResponse.json({ error: 'ID del evaluador es requerido' }, { status: 400 })
    }

    const success = await postgresAPI.deleteEvaluador(process as 'ccm' | 'prr', parseInt(id));
    
    // Invalidar caché
    const cacheKey = `evaluadores_general_${process}`
    await memoryCache.del(cacheKey)
    logInfo(`🧹 Caché en memoria invalidado para: ${cacheKey}`);

    if (!success) {
      return NextResponse.json({ error: 'Evaluador no encontrado' }, { status: 404 })
    }
    
    logInfo('✅ Evaluador eliminado exitosamente');
    return NextResponse.json({ message: 'Evaluador eliminado exitosamente' });
    
  } catch (error) {
    logError('❌ Error eliminando evaluador:', error);
    
    if ((error as any)?.message?.includes('no encontrado')) {
      return NextResponse.json({ error: 'Evaluador no encontrado' }, { status: 404 })
    }
    
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
} 