CREATE TABLE "historico_pendientes_operador" (
	"id" serial PRIMARY KEY NOT NULL,
	"fecha" date NOT NULL,
	"trimestre" integer NOT NULL,
	"proceso" text NOT NULL,
	"operador" text NOT NULL,
	"anio_expediente" integer NOT NULL,
	"pendientes" integer NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "historico_sin_asignar" (
	"id" serial PRIMARY KEY NOT NULL,
	"fecha" date NOT NULL,
	"trimestre" integer NOT NULL,
	"proceso" text NOT NULL,
	"anio_expediente" integer DEFAULT 0 NOT NULL,
	"sin_asignar" integer NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "historico_spe_pendientes" (
	"id" serial PRIMARY KEY NOT NULL,
	"fecha" date NOT NULL,
	"trimestre" integer NOT NULL,
	"operador" text NOT NULL,
	"pendientes" integer NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "evaluadores_ccm" (
	"id" serial PRIMARY KEY NOT NULL,
	"nombres_apellidos" text,
	"nombre_en_base" text NOT NULL,
	"regimen" text,
	"turno" text,
	"modalidad" text,
	"sub_equipo" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "evaluadores_prr" (
	"id" serial PRIMARY KEY NOT NULL,
	"nombres_apellidos" text,
	"nombre_en_base" text NOT NULL,
	"regimen" text,
	"turno" text,
	"modalidad" text,
	"sub_equipo" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "file_processing_jobs" (
	"id" text PRIMARY KEY NOT NULL,
	"file_name" text NOT NULL,
	"status" text NOT NULL,
	"progress" integer DEFAULT 0,
	"message" text,
	"error" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "table_ccm" (
	"textbox4" text,
	"dependencia" text,
	"anio" integer,
	"mes" integer,
	"numerotramite" text,
	"ultimaetapa" text,
	"fechaexpendiente" date,
	"fechaetapaaprobacionmasivafin" date,
	"fechapre" date,
	"operadorpre" text,
	"estadopre" text,
	"estadotramite" text,
	"archivo_origen" text,
	"operador" text,
	"fecha_asignacion" date,
	"modalidad" text,
	"regimen" text,
	"meta_antigua" text,
	"meta_nueva" text,
	"equipo" text
);
--> statement-breakpoint
CREATE TABLE "table_prr" (
	"textbox4" text,
	"dependencia" text,
	"anio" integer,
	"mes" integer,
	"numerotramite" text,
	"ultimaetapa" text,
	"fechaexpendiente" date,
	"fechaetapaaprobacionmasivafin" date,
	"fechapre" date,
	"operadorpre" text,
	"estadopre" text,
	"estadotramite" text,
	"archivo_origen" text,
	"operador" text,
	"fecha_asignacion" date,
	"modalidad" text,
	"regimen" text,
	"meta_antigua" text,
	"meta_nueva" text,
	"equipo" text
);
--> statement-breakpoint
CREATE UNIQUE INDEX "fecha_proceso_operador_anio_idx" ON "historico_pendientes_operador" USING btree ("fecha","proceso","operador","anio_expediente");--> statement-breakpoint
CREATE UNIQUE INDEX "fecha_proceso_sin_asignar_anio_idx" ON "historico_sin_asignar" USING btree ("fecha","proceso","anio_expediente");--> statement-breakpoint
CREATE UNIQUE INDEX "spe_fecha_operador_idx" ON "historico_spe_pendientes" USING btree ("fecha","operador");