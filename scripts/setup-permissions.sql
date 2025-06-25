-- Script para configurar permisos de PostgREST para el rol admin_bd
-- Ejecuta este script en tu base de datos PostgreSQL

-- 1. Asegurar que el rol admin_bd existe
CREATE ROLE IF NOT EXISTS admin_bd;

-- 2. Dar permisos de lectura y escritura a las tablas de evaluadores
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE evaluadores_ccm TO admin_bd;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE evaluadores_prr TO admin_bd;

-- 3. Si las tablas tienen secuencias para IDs, dar permisos también
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO admin_bd;

-- 4. Dar permisos al esquema public
GRANT USAGE ON SCHEMA public TO admin_bd;

-- 5. Para futuras tablas (opcional)
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO admin_bd;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO admin_bd;

-- Verificar permisos
SELECT 
    schemaname,
    tablename,
    tableowner,
    hasinserts,
    hasselects,
    hasupdates,
    hasdeletes
FROM pg_tables pt
LEFT JOIN (
    SELECT 
        schemaname,
        tablename,
        has_table_privilege('admin_bd', schemaname||'.'||tablename, 'INSERT') as hasinserts,
        has_table_privilege('admin_bd', schemaname||'.'||tablename, 'SELECT') as hasselects,
        has_table_privilege('admin_bd', schemaname||'.'||tablename, 'UPDATE') as hasupdates,
        has_table_privilege('admin_bd', schemaname||'.'||tablename, 'DELETE') as hasdeletes
    FROM pg_tables 
    WHERE tablename LIKE 'evaluadores_%'
) perms USING (schemaname, tablename)
WHERE tablename LIKE 'evaluadores_%'; 