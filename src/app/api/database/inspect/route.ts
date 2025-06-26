import { NextRequest, NextResponse } from 'next/server';
import postgresAPI from '@/lib/postgres-api';
import { logInfo, logError } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tableName = searchParams.get('table');
    const sampleSize = parseInt(searchParams.get('sample') || '5');

    logInfo('🔍 Iniciando inspección de base de datos PostgreSQL...');

    // Inspeccionar estructura completa
    const { tables, tableDetails } = await postgresAPI.inspectDatabase();
    
    let sampleData = null;
    if (tableName && tables.includes(tableName)) {
      logInfo(`📋 Obteniendo muestra de datos de tabla: ${tableName}`);
      sampleData = await postgresAPI.getSampleData(tableName, sampleSize);
    }

    // Health check del pool
    const healthCheck = await postgresAPI.healthCheck();

    const response = {
      database: {
        status: healthCheck.status,
        name: process.env.PGDATABASE || 'bdmigra',
        responseTime: healthCheck.responseTime,
        poolStats: healthCheck.poolStats
      },
      structure: {
        totalTables: tables.length,
        tables: tables,
        tableDetails: tableDetails
      },
      sampleData: sampleData ? {
        table: tableName,
        records: sampleData.length,
        data: sampleData
      } : null,
      debug: {
        searchedTable: tableName,
        sampleSize: sampleSize,
        availableTables: tables,
      timestamp: new Date().toISOString()
      }
    };

    logInfo('✅ Inspección completada:', {
      tables: tables.length,
      hasTableDetails: Object.keys(tableDetails).length,
      requestedTable: tableName
    });

    return NextResponse.json(response);

  } catch (error) {
    logError('❌ Error durante inspección de base de datos:', error);
    
    return NextResponse.json(
      {
        error: 'Error inspeccionando la base de datos',
        details: error instanceof Error ? error.message : 'Error desconocido',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
} 
 
 