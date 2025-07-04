CREATE TABLE "historico_sol_pendientes" (
	"id" serial PRIMARY KEY NOT NULL,
	"fecha" date NOT NULL,
	"trimestre" integer NOT NULL,
	"operador" text NOT NULL,
	"pendientes" integer NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "historico_spe_produccion_agg" (
	"id" serial PRIMARY KEY NOT NULL,
	"fecha" date NOT NULL,
	"evaluador" text NOT NULL,
	"total" integer NOT NULL,
	"finalizadas" integer NOT NULL,
	"iniciadas" integer NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE UNIQUE INDEX "sol_fecha_operador_idx" ON "historico_sol_pendientes" USING btree ("fecha","operador");