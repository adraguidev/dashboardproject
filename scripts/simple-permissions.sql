-- Script simple para dar permisos al rol admin_bd

-- Dar todos los permisos en las tablas de evaluadores
GRANT ALL PRIVILEGES ON evaluadores_ccm TO admin_bd;
GRANT ALL PRIVILEGES ON evaluadores_prr TO admin_bd;

-- Dar permisos en el esquema
GRANT USAGE ON SCHEMA public TO admin_bd;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO admin_bd;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO admin_bd; 