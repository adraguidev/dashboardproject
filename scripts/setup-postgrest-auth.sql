-- Script para configurar autenticación PostgREST en Neon
-- Ejecutar este script como usuario administrador (bdmigra_owner)

-- 1. Crear roles necesarios para PostgREST
CREATE ROLE IF NOT EXISTS anonymous NOLOGIN;
CREATE ROLE IF NOT EXISTS authenticated NOLOGIN;

-- 2. Otorgar permisos al role owner para asumir estos roles
GRANT anonymous TO bdmigra_owner;
GRANT authenticated TO bdmigra_owner;

-- 3. Permisos para role anonymous (solo lectura)
GRANT USAGE ON SCHEMA public TO anonymous;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anonymous;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO anonymous;

-- 4. Permisos para role authenticated (lectura y escritura)
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;

-- 5. Permisos específicos para las tablas de evaluadores
-- Para evaluadores_ccm
GRANT SELECT, INSERT, UPDATE, DELETE ON evaluadores_ccm TO authenticated;
GRANT SELECT ON evaluadores_ccm TO anonymous;

-- Para evaluadores_prr  
GRANT SELECT, INSERT, UPDATE, DELETE ON evaluadores_prr TO authenticated;
GRANT SELECT ON evaluadores_prr TO anonymous;

-- 6. Verificar que los roles se crearon correctamente
SELECT rolname, rolcanlogin 
FROM pg_roles 
WHERE rolname IN ('anonymous', 'authenticated', 'bdmigra_owner');

-- 7. Verificar permisos en las tablas
SELECT 
    schemaname, 
    tablename, 
    grantor, 
    grantee, 
    privilege_type
FROM information_schema.table_privileges 
WHERE grantee IN ('anonymous', 'authenticated')
AND tablename LIKE 'evaluadores_%'
ORDER BY tablename, grantee, privilege_type;

COMMENT ON ROLE anonymous IS 'Rol para acceso no autenticado (solo lectura)';
COMMENT ON ROLE authenticated IS 'Rol para usuarios autenticados (lectura y escritura)'; 
 
 