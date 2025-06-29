import { pgTable, text, integer, date, serial, timestamp } from "drizzle-orm/pg-core";

const mainColumns = {
  textbox4: text('textbox4'),
  dependencia: text('dependencia'),
  anio: integer('anio'),
  mes: integer('mes'),
  numerotramite: text('numerotramite'),
  ultimaetapa: text('ultimaetapa'),
  fechaexpendiente: date('fechaexpendiente'),
  fechaetapaaprobacionmasivafin: date('fechaetapaaprobacionmasivafin'),
  fechapre: date('fechapre'),
  operadorpre: text('operadorpre'),
  estadopre: text('estadopre'),
  estadotramite: text('estadotramite'),
  archivo_origen: text('archivo_origen'),
  operador: text('operador'),
  fecha_asignacion: date('fecha_asignacion'),
  modalidad: text('modalidad'),
  regimen: text('regimen'),
  meta_antigua: text('meta_antigua'),
  meta_nueva: text('meta_nueva'),
  equipo: text('equipo'),
};

export const tableCCM = pgTable('table_ccm', mainColumns);
export const tablePRR = pgTable('table_prr', mainColumns);

export const evaluadoresCCM = pgTable('evaluadores_ccm', {
  id: serial('id').primaryKey(),
  nombres_apellidos: text('nombres_apellidos'),
  nombre_en_base: text('nombre_en_base').notNull(),
  regimen: text('regimen'),
  turno: text('turno'),
  modalidad: text('modalidad'),
  sub_equipo: text('sub_equipo').notNull(),
});

export const evaluadoresPRR = pgTable('evaluadores_prr', {
  id: serial('id').primaryKey(),
  nombres_apellidos: text('nombres_apellidos'),
  nombre_en_base: text('nombre_en_base').notNull(),
  regimen: text('regimen'),
  turno: text('turno'),
  modalidad: text('modalidad'),
  sub_equipo: text('sub_equipo').notNull(),
});

export const fileProcessingJobs = pgTable('file_processing_jobs', {
  id: text('id').primaryKey(),
  fileName: text('file_name').notNull(),
  status: text('status').notNull(),
  progress: integer('progress').default(0),
  message: text('message'),
  error: text('error'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}); 