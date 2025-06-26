import { NextRequest, NextResponse } from 'next/server';
import { createDirectDatabaseAPI } from '@/lib/db';
import { logInfo, logError } from '@/lib/logger';

interface TableInspectionData {
  exists: boolean;
  rowCount: number;
  sampleData: any[];
  description: string;
}

interface InspectionResults {
  [key: string]: TableInspectionData;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tableName = searchParams.get('table');
    const sampleSize = parseInt(searchParams.get('sample') || '5');

    logInfo('🔍 Iniciando inspección de base de datos PostgreSQL con conexión directa...');
    const startTime = Date.now();
    const dbAPI = await createDirectDatabaseAPI();

    // Inspeccionar estructura completa y obtener datos
    const inspectionResults: InspectionResults = await dbAPI.inspectTables();
    const responseTime = Date.now() - startTime;
    
    const tableNames = Object.keys(inspectionResults);
    
    const tableDetails = Object.entries(inspectionResults).reduce((acc, [name, data]) => {
      acc[name] = {
        rowCount: data.rowCount,
        description: data.description,
        columns: data.sampleData.length > 0 ? Object.keys(data.sampleData[0]) : []
      };
      return acc;
    }, {} as Record<string, any>);

    let sampleDataResponse = null;
    if (tableName && inspectionResults[tableName]) {
      logInfo(`📋 Obteniendo muestra de datos de tabla: ${tableName}`);
      const fullSample = inspectionResults[tableName].sampleData;
      sampleDataResponse = {
        table: tableName,
        records: fullSample.length,
        data: fullSample.slice(0, sampleSize)
      };
    }

    const response = {
      database: {
        status: 'healthy',
        name: 'PostgreSQL (Neon)',
        responseTime: `${responseTime}ms`,
        poolStats: 'N/A (Conexión sin pool en serverless)'
      },
      structure: {
        totalTables: tableNames.length,
        tables: tableNames,
        tableDetails: tableDetails
      },
      sampleData: sampleDataResponse,
      debug: {
        searchedTable: tableName,
        sampleSize: sampleSize,
        availableTables: tableNames,
        timestamp: new Date().toISOString()
      }
    };

    logInfo('✅ Inspección completada:', {
      tables: tableNames.length,
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
 
 