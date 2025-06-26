import { NextResponse } from 'next/server'
import { createDirectDatabaseAPI } from '@/lib/db'
import { logInfo, logError } from '@/lib/logger'

export async function GET() {
  try {
    logInfo('🔍 Verificando estado de la base de datos PostgreSQL con conexión directa...')
    
    const startTime = Date.now();
    const dbAPI = await createDirectDatabaseAPI();
    
    // 1. Probar conexión básica
    const isConnected = await dbAPI.testConnection();
    const responseTime = Date.now() - startTime;

    if (!isConnected) {
      throw new Error('No se pudo establecer conexión con la base de datos.');
    }

    // 2. Obtener estadísticas de tablas
    const tablesInfo = await dbAPI.inspectTables();
    
    const healthCheck = {
      status: 'healthy',
      database: 'PostgreSQL (Neon)',
      responseTime: responseTime,
      timestamp: new Date().toISOString(),
      poolStats: 'N/A (Conexión sin pool en serverless)',
      tablesCounts: Object.entries(tablesInfo).map(([tableName, tableData]) => ({
        table: tableName,
        count: tableData.rowCount
      }))
    };

    logInfo('✅ Health check completado:', healthCheck);
    
    return NextResponse.json({
      status: healthCheck.status,
      message: 'Base de datos PostgreSQL funcionando correctamente',
      details: {
        database: healthCheck.database,
        responseTime: `${healthCheck.responseTime}ms`,
        timestamp: healthCheck.timestamp,
        poolStats: healthCheck.poolStats,
        tablesCounts: healthCheck.tablesCounts
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logError('❌ Error verificando estado de la base de datos:', error);
    
    return NextResponse.json(
      {
        status: 'error',
        message: 'Error verificando la base de datos',
        error: error instanceof Error ? error.message : 'Error desconocido',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
} 
 
 