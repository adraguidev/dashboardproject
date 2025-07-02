-- ============================================
-- CREAR TABLA PARA HISTÓRICO SPE PENDIENTES
-- ============================================

-- Crear tabla principal
CREATE TABLE "historico_spe_pendientes" (
    "id" serial PRIMARY KEY NOT NULL,
    "fecha" date NOT NULL,
    "trimestre" integer NOT NULL,
    "operador" text NOT NULL,
    "pendientes" integer NOT NULL,
    "created_at" timestamp DEFAULT now()
);

-- Crear índice único para evitar duplicados
CREATE UNIQUE INDEX "spe_fecha_operador_idx" ON "historico_spe_pendientes" USING btree ("fecha","operador");

-- Verificar que se creó correctamente
SELECT 
    table_name, 
    column_name, 
    data_type, 
    is_nullable 
FROM information_schema.columns 
WHERE table_name = 'historico_spe_pendientes' 
ORDER BY ordinal_position;

-- Verificar índices
SELECT 
    indexname, 
    indexdef 
FROM pg_indexes 
WHERE tablename = 'historico_spe_pendientes'; 