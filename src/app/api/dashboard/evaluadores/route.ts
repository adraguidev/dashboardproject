import { NextRequest, NextResponse } from 'next/server'
import { createDirectDatabaseAPI } from '@/lib/db';
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

interface EvaluadorData {
  nombre_en_base?: string;
  nombres_apellidos?: string;
  id?: number;
}

// GET - Obtener evaluadores usando la nueva API directa
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const process = searchParams.get('process') || 'ccm'
    
    if (!['ccm', 'prr'].includes(process)) {
      return NextResponse.json({ error: 'Proceso inválido. Debe ser ccm o prr' }, { status: 400 })
    }

    logInfo(`🔍 Obteniendo evaluadores para proceso: ${process.toUpperCase()}`);
    
    const dbAPI = await createDirectDatabaseAPI();
    const evaluadores = await dbAPI.getEvaluadoresGestion(process as 'ccm' | 'prr');
    
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
    logInfo('➕ Creando nuevo evaluador con conexión directa');
    
    const { searchParams } = new URL(request.url)
    const process = searchParams.get('process') || 'ccm'
    
    if (!['ccm', 'prr'].includes(process)) {
      return NextResponse.json({ error: 'Proceso inválido. Debe ser ccm o prr' }, { status: 400 })
    }

    const data = await request.json() as EvaluadorData;
    
    if (!data.nombre_en_base || !data.nombres_apellidos) {
      return NextResponse.json({ error: 'Nombre en base y nombres y apellidos son requeridos' }, { status: 400 })
    }

    const dbAPI = await createDirectDatabaseAPI();
    const result = await dbAPI.createEvaluador(process as 'ccm' | 'prr', data);
    
    // Invalidar cachés relevantes
    const cacheKeysToClear = [
      `evaluadores_general_${process}`,
      `pendientes_${process}_year`,
      `pendientes_${process}_quarter`,
      `pendientes_${process}_month`
    ];
    cacheKeysToClear.forEach(async (key) => {
      await memoryCache.del(key)
      logInfo(`🧹 Caché en memoria invalidado para: ${key}`);
    });

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
    logInfo('🔄 Actualizando evaluador con conexión directa');
    
    const { searchParams } = new URL(request.url)
    const process = searchParams.get('process')
    const id = searchParams.get('id')
    
    if (!process || !['ccm', 'prr'].includes(process)) {
      return NextResponse.json({ error: 'Proceso inválido. Debe ser ccm o prr' }, { status: 400 })
    }
    
    if (!id) {
      return NextResponse.json({ error: 'ID del evaluador es requerido' }, { status: 400 })
    }

    const data = await request.json() as EvaluadorData;
    delete data.id; // Nos aseguramos de no intentar actualizar el ID

    const dbAPI = await createDirectDatabaseAPI();
    const result = await dbAPI.updateEvaluador(process as 'ccm' | 'prr', parseInt(id), data);
    
    // Invalidar cachés relevantes
    const cacheKeysToClear = [
      `evaluadores_general_${process}`,
      `pendientes_${process}_year`,
      `pendientes_${process}_quarter`,
      `pendientes_${process}_month`
    ];
    cacheKeysToClear.forEach(async (key) => {
      await memoryCache.del(key)
      logInfo(`🧹 Caché en memoria invalidado para: ${key}`);
    });

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
    logInfo('🗑️ Eliminando evaluador con conexión directa');
    
    const { searchParams } = new URL(request.url)
    const process = searchParams.get('process')
    const id = searchParams.get('id')
    
    if (!process || !['ccm', 'prr'].includes(process)) {
      return NextResponse.json({ error: 'Proceso inválido. Debe ser ccm o prr' }, { status: 400 })
    }
    
    if (!id) {
      return NextResponse.json({ error: 'ID del evaluador es requerido' }, { status: 400 })
    }

    const dbAPI = await createDirectDatabaseAPI();
    const success = await dbAPI.deleteEvaluador(process as 'ccm' | 'prr', parseInt(id));
    
    // Invalidar cachés relevantes
    const cacheKeysToClear = [
      `evaluadores_general_${process}`,
      `pendientes_${process}_year`,
      `pendientes_${process}_quarter`,
      `pendientes_${process}_month`
    ];
    cacheKeysToClear.forEach(async (key) => {
      await memoryCache.del(key)
      logInfo(`🧹 Caché en memoria invalidado para: ${key}`);
    });

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