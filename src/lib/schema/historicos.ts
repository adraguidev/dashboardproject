import { pgTable, serial, text, integer, date, uniqueIndex, timestamp } from 'drizzle-orm/pg-core'

/**
 * Tabla para almacenar el histórico de expedientes pendientes por operador.
 * Cada registro representa el número de expedientes pendientes para un operador,
 * en una fecha específica, para un proceso (CCM/PRR) y un año de expediente concreto.
 */
export const historicoPendientesOperador = pgTable(
  'historico_pendientes_operador',
  {
    id: serial('id').primaryKey(),
    fecha: date('fecha').notNull(),
    trimestre: integer('trimestre').notNull(),
    proceso: text('proceso', { enum: ['CCM', 'PRR'] }).notNull(),
    operador: text('operador').notNull(),
    anioExpediente: integer('anio_expediente').notNull(),
    pendientes: integer('pendientes').notNull(),
    createdAt: timestamp('created_at').defaultNow(),
  },
  table => {
    return {
      // Indice único para evitar duplicados. Permite usar UPSERT (INSERT ... ON CONFLICT).
      // Si se intenta insertar un registro para la misma fecha, proceso, operador y año,
      // se puede actualizar en lugar de crear uno nuevo.
      fechaProcesoOperadorAnioUnico: uniqueIndex('fecha_proceso_operador_anio_idx').on(
        table.fecha,
        table.proceso,
        table.operador,
        table.anioExpediente,
      ),
    }
  },
)

/**
 * Tabla para almacenar el histórico de expedientes pendientes sin asignar.
 * Cada registro representa el número de expedientes sin asignar para un proceso y año de expediente
 * en una fecha concreta.
 */
export const historicoSinAsignar = pgTable(
  'historico_sin_asignar',
  {
    id: serial('id').primaryKey(),
    fecha: date('fecha').notNull(),
    trimestre: integer('trimestre').notNull(),
    proceso: text('proceso', { enum: ['CCM', 'PRR'] }).notNull(),
    // Para la data migrada del CSV que no tenía año, se usará un valor por defecto (ej. 0 o 1900).
    // Para los nuevos snapshots, se calculará por año de expediente.
    anioExpediente: integer('anio_expediente').notNull().default(0),
    sinAsignar: integer('sin_asignar').notNull(),
    createdAt: timestamp('created_at').defaultNow(),
  },
  table => {
    return {
      // Indice único para la sobrescritura diaria (UPSERT).
      fechaProcesoAnioUnico: uniqueIndex('fecha_proceso_sin_asignar_anio_idx').on(
        table.fecha,
        table.proceso,
        table.anioExpediente,
      ),
    }
  },
)

/**
 * Tabla para almacenar el histórico de expedientes pendientes SPE por operador.
 * Similar a historico_pendientes_operador pero específica para SPE.
 */
export const historicoSpePendientes = pgTable(
  'historico_spe_pendientes',
  {
    id: serial('id').primaryKey(),
    fecha: date('fecha').notNull(),
    trimestre: integer('trimestre').notNull(),
    operador: text('operador').notNull(),
    // Para SPE no usamos años de expediente como CCM/PRR
    pendientes: integer('pendientes').notNull(),
    createdAt: timestamp('created_at').defaultNow(),
  },
  table => {
    return {
      // Índice único para evitar duplicados en SPE
      fechaOperadorUnico: uniqueIndex('spe_fecha_operador_idx').on(
        table.fecha,
        table.operador,
      ),
    }
  },
)

export type HistoricoPendientesOperador = typeof historicoPendientesOperador.$inferSelect
export type NewHistoricoPendientesOperador = typeof historicoPendientesOperador.$inferInsert

export type HistoricoSinAsignar = typeof historicoSinAsignar.$inferSelect
export type NewHistoricoSinAsignar = typeof historicoSinAsignar.$inferInsert

export type HistoricoSpePendientes = typeof historicoSpePendientes.$inferSelect
export type NewHistoricoSpePendientes = typeof historicoSpePendientes.$inferInsert 