DROP TABLE IF EXISTS "historico_spe_produccion";

CREATE TABLE "historico_spe_produccion_agg" (
    "id" serial PRIMARY KEY NOT NULL,
    "fecha" date NOT NULL,
    "evaluador" text NOT NULL,
    "total" integer NOT NULL,
    "finalizadas" integer NOT NULL,
    "iniciadas" integer NOT NULL,
    "created_at" timestamp DEFAULT now()
); 