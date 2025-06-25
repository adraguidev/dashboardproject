import { NextRequest, NextResponse } from 'next/server'
import { getDrizzleDB } from '@/lib/db'
import { sql } from 'drizzle-orm'

// GET - Obtener evaluadores usando Drizzle ORM
export async function GET(request: NextRequest) {
  try {
    console.log('\n🔍 === OBTENIENDO EVALUADORES CON DRIZZLE ===')
    
    // Verificar autenticación y obtener conexión DB
    const { db, userId, userEmail } = await getDrizzleDB()
    console.log('✅ Usuario autenticado:', userEmail)
    
    const { searchParams } = new URL(request.url)
    const process = searchParams.get('process') || 'ccm'
    
    if (!['ccm', 'prr'].includes(process)) {
      return NextResponse.json({ error: 'Proceso inválido. Debe ser ccm o prr' }, { status: 400 })
    }

    const tableName = `evaluadores_${process}`
    
    console.log(`🔍 Consultando tabla: ${tableName}`)
    
    // Usar Drizzle con SQL raw para consultar nuestras tablas existentes
    const result = await db.execute(
      sql`SELECT * FROM ${sql.identifier(tableName)} ORDER BY nombre_en_base ASC`
    )
    
    console.log(`✅ Encontrados ${result.rows.length} evaluadores`)
    
    // Convertir el resultado a formato esperado y mapear todos los campos legacy
    const evaluadores = result.rows.map((row: any) => ({
      id: row.id,
      nombre_en_base: row.nombre_en_base ?? '-',
      nombres_apellidos: row.nombres_apellidos ?? row.nombre_real ?? row.nombre_en_base ?? '-',
      nombre_real: row.nombres_apellidos ?? row.nombre_real ?? row.nombre_en_base ?? '-',
      regimen: row.regimen ?? '-',
      turno: row.turno ?? '-',
      modalidad: row.modalidad ?? '-',
      sub_equipo: row.sub_equipo ?? '-',
      activo: row.activo ?? null,
      fecha_ingreso: row.fecha_ingreso ?? null,
      fecha_salida: row.fecha_salida ?? null,
      lider: row.lider ?? null,
      creado_en: row.creado_en ?? null
    }))
    
    console.log('🔍 === FIN OBTENER EVALUADORES ===\n')
    
    return NextResponse.json(evaluadores)
    
  } catch (error) {
    console.error('❌ Error obteniendo evaluadores:', error)
    
    if (error instanceof Error && error.message.includes('No userId')) {
      return NextResponse.json(
        { error: 'No autorizado. Debes iniciar sesión.' },
        { status: 401 }
      )
    }
    
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// POST - Crear nuevo evaluador
export async function POST(request: NextRequest) {
  try {
    console.log('\n➕ === CREANDO EVALUADOR CON DRIZZLE ===')
    
    const { db, userId, userEmail } = await getDrizzleDB()
    console.log('✅ Usuario autenticado:', userEmail)
    
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

    const tableName = `evaluadores_${process}`
    
    console.log(`➕ Insertando en tabla: ${tableName}`)
    
    const result = await db.execute(
      sql`
        INSERT INTO ${sql.identifier(tableName)}
        (nombre_en_base, nombres_apellidos, regimen, turno, modalidad, sub_equipo)
        VALUES (
          ${nombre_en_base},
          ${nombres_apellidos},
          ${regimen ?? null},
          ${turno ?? null},
          ${modalidad ?? null},
          ${sub_equipo ?? null}
        )
        RETURNING *
      `
    )
    
    console.log('✅ Evaluador creado exitosamente')
    console.log('➕ === FIN CREAR EVALUADOR ===\n')
    
    return NextResponse.json(result.rows[0], { status: 201 })
    
  } catch (error) {
    console.error('❌ Error creando evaluador:', error)
    
    if (error instanceof Error && error.message.includes('No userId')) {
      return NextResponse.json(
        { error: 'No autorizado. Debes iniciar sesión.' },
        { status: 401 }
      )
    }
    
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// PUT - Actualizar evaluador
export async function PUT(request: NextRequest) {
  try {
    console.log('\n🔄 === ACTUALIZANDO EVALUADOR CON DRIZZLE ===')
    
    const { db, userId, userEmail } = await getDrizzleDB()
    console.log('✅ Usuario autenticado:', userEmail)
    
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
    // Aseguramos que los datos coincidan con lo que envía el frontend
    const { 
      nombres_apellidos, 
      nombre_en_base, 
      regimen, 
      turno, 
      modalidad, 
      sub_equipo 
    } = data

    const tableName = `evaluadores_${process}`
    
    console.log(`🔄 Actualizando en tabla: ${tableName}, ID: ${id}`)
    
    // Construcción dinámica de la query para evitar errores con campos nulos
    const result = await db.execute(
      sql`
        UPDATE ${sql.identifier(tableName)} 
        SET 
          nombre_en_base = ${nombre_en_base ?? null},
          nombres_apellidos = ${nombres_apellidos ?? null},
          regimen = ${regimen ?? null},
          turno = ${turno ?? null},
          modalidad = ${modalidad ?? null},
          sub_equipo = ${sub_equipo ?? null}
        WHERE id = ${id} 
        RETURNING *
      `
    )
    
    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Evaluador no encontrado' }, { status: 404 })
    }
    
    console.log('✅ Evaluador actualizado exitosamente')
    console.log('🔄 === FIN ACTUALIZAR EVALUADOR ===\n')
    
    return NextResponse.json(result.rows[0])
    
  } catch (error) {
    console.error('❌ Error actualizando evaluador:', error)
    
    if (error instanceof Error && error.message.includes('No userId')) {
      return NextResponse.json(
        { error: 'No autorizado. Debes iniciar sesión.' },
        { status: 401 }
      )
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
    console.log('\n🗑️ === ELIMINANDO EVALUADOR CON DRIZZLE ===')
    
    const { db, userId, userEmail } = await getDrizzleDB()
    console.log('✅ Usuario autenticado:', userEmail)
    
    const { searchParams } = new URL(request.url)
    const process = searchParams.get('process')
    const id = searchParams.get('id')
    
    if (!process || !['ccm', 'prr'].includes(process)) {
      return NextResponse.json({ error: 'Proceso inválido. Debe ser ccm o prr' }, { status: 400 })
    }
    
    if (!id) {
      return NextResponse.json({ error: 'ID del evaluador es requerido' }, { status: 400 })
    }

    const tableName = `evaluadores_${process}`
    
    console.log(`🗑️ Eliminando de tabla: ${tableName}, ID: ${id}`)
    
    const result = await db.execute(
      sql`DELETE FROM ${sql.identifier(tableName)} WHERE id = ${id} RETURNING *`
    )
    
    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Evaluador no encontrado' }, { status: 404 })
    }
    
    console.log('✅ Evaluador eliminado exitosamente')
    console.log('🗑️ === FIN ELIMINAR EVALUADOR ===\n')
    
    return NextResponse.json({ message: 'Evaluador eliminado exitosamente' })
    
  } catch (error) {
    console.error('❌ Error eliminando evaluador:', error)
    
    if (error instanceof Error && error.message.includes('No userId')) {
      return NextResponse.json(
        { error: 'No autorizado. Debes iniciar sesión.' },
        { status: 401 }
      )
    }
    
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
} 