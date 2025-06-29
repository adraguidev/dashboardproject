import { NextRequest, NextResponse } from 'next/server'
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3'
import { Pool } from 'pg'
import { drizzle as drizzleNode, NodePgDatabase } from 'drizzle-orm/node-postgres'
import { sql } from 'drizzle-orm'
import { Readable } from 'stream'
import { Workbook } from 'exceljs'
import csvParser from 'csv-parser'
import * as path from 'path'
import { v4 as uuidv4 } from 'uuid'
import { jobStatusManager } from '@/lib/redis'
import { pgTable, text, integer, date } from 'drizzle-orm/pg-core'

// Configuración de Cloudflare R2
const r2Client = new S3Client({
  region: 'auto',
  endpoint: process.env.CLOUDFLARE_R2_ENDPOINT!,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY!,
  },
})

const BUCKET_NAME = process.env.CLOUDFLARE_R2_BUCKET_NAME!

// Esquema canónico para asegurar que las tablas siempre tengan las columnas correctas.
const canonicalSchema = {
  table_ccm: [
    "textbox4", "dependencia", "anio", "mes", "numerotramite", "ultimaetapa",
    "fechaexpendiente", "fechaetapaaprobacionmasivafin", "fechapre", "operadorpre",
    "estadopre", "estadotramite", "archivo_origen", "operador", "fecha_asignacion",
    "modalidad", "regimen", "meta_antigua", "meta_nueva", "equipo"
  ],
  table_prr: [
    "textbox4", "dependencia", "anio", "mes", "numerotramite", "ultimaetapa",
    "fechaexpendiente", "fechaetapaaprobacionmasivafin", "fechapre", "operadorpre",
    "estadopre", "estadotramite", "archivo_origen", "operador", "fecha_asignacion",
    "modalidad", "regimen", "meta_antigua", "meta_nueva", "equipo"
  ]
};

const dateColumns = [
  "fechaexpendiente",
  "fechaetapaaprobacionmasivafin", 
  "fechapre",
  "fecha_asignacion"
]

// Definir los schemas de tabla para que Drizzle los pueda usar en las inserciones
const tableCCM = pgTable('table_ccm', {
  ...Object.fromEntries(canonicalSchema.table_ccm.map(col => [col, text(col)]))
});

const tablePRR = pgTable('table_prr', {
  ...Object.fromEntries(canonicalSchema.table_prr.map(col => [col, text(col)]))
});

export async function POST(request: NextRequest) {
  console.log('🔄 Iniciando procesamiento de archivos desde R2...');
  
  const jobId = uuidv4();

  try {
    if (!process.env.DATABASE_DIRECT_URL) {
      throw new Error('Variable DATABASE_DIRECT_URL no configurada');
    }

    const body = await request.json();
    const { files } = body;

    if (!files || !Array.isArray(files) || files.length === 0) {
      return NextResponse.json({ error: 'Debes proporcionar información de los archivos a procesar.' }, { status: 400 });
    }

    // Iniciar el procesamiento en background sin esperar (no usar await)
    processFilesFromR2(jobId, files).catch(async (error) => {
      console.error(`[Job ${jobId}] ❌ Error en la ejecución principal del background:`, error);
      await jobStatusManager.update(jobId, { 
        status: 'error', 
        message: 'Error crítico en el worker.',
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    });

    console.log(`[Job ${jobId}] ✅ Tarea de procesamiento iniciada. Respondiendo inmediatamente.`);

    // Responder inmediatamente con el ID del trabajo
    return NextResponse.json({
      success: true,
      message: 'Procesamiento de archivos iniciado. Consulta el estado con el ID del trabajo.',
      jobId: jobId,
      status: 'processing_started'
    }, { status: 202 });

  } catch (error) {
    console.error(`[Job ${jobId}] ❌ Error al iniciar el procesamiento:`, error);
    return NextResponse.json({ 
      error: 'Error al iniciar el procesamiento', 
      details: error instanceof Error ? error.message : 'Error desconocido' 
    }, { status: 500 });
  }
}

// Lógica principal de procesamiento en background
async function processFilesFromR2(jobId: string, files: Array<{fileName: string, key: string, table: string}>) {
  await jobStatusManager.update(jobId, { status: 'in_progress', message: 'Iniciando...', progress: 0 });
  console.log(`[Job ${jobId}] [Stream] 🔄 Iniciando procesamiento en background...`);
  
  // Usar el driver pg que soporta transacciones completas
  const pool = new Pool({ connectionString: process.env.DATABASE_DIRECT_URL! });
  const db: NodePgDatabase = drizzleNode(pool);

  for (const [index, fileInfo] of files.entries()) {
    const fileProgressStart = (index / files.length) * 100;
    const fileProgressEnd = ((index + 1) / files.length) * 100;

    try {
      await db.transaction(async (tx) => {
        const message = `Procesando archivo ${index + 1}/${files.length}: ${fileInfo.fileName}`;
        await jobStatusManager.update(jobId, { status: 'in_progress', message, progress: fileProgressStart });
        
        await processSingleFileStream(tx, fileInfo, jobId, (progress) => {
          // Actualizar progreso dentro del archivo (0 a 100) -> escalado al progreso total
          const overallProgress = fileProgressStart + (progress / 100) * (fileProgressEnd - fileProgressStart);
          jobStatusManager.update(jobId, { status: 'in_progress', message, progress: overallProgress });
        });
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      await jobStatusManager.update(jobId, { status: 'error', message: `Error en ${fileInfo.fileName}`, error: errorMessage });
      console.error(`[Job ${jobId}] [Transaction] ❌ Error en transacción para ${fileInfo.fileName}.`, error);
      return; // Detener el proceso si un archivo falla
    }
  }

  // Conversión de fechas post-procesamiento
  console.log(`[Job ${jobId}] [Stream] 🗓️  Iniciando conversión de columnas de fecha...`);
  await convertAllDateColumns(db);
  console.log(`[Job ${jobId}] [Stream] ✅ Conversión de fechas completada.`);
  
  await pool.end(); // Cerrar la conexión al finalizar
}

// Procesa un único archivo usando streams dentro de una transacción
async function processSingleFileStream(tx: any, fileInfo: {fileName: string, key: string, table: string}, jobId: string, onProgress: (progress: number) => void) {
    const { fileName, key, table } = fileInfo;
    console.log(`[Job ${jobId}] [Stream] 🚀 Procesando: ${fileName}`);

    const r2Stream = await getR2FileStream(key);
    const canonicalColumns = canonicalSchema[table as keyof typeof canonicalSchema];
    
    // 1. Asegurar que la tabla exista con el esquema correcto
    await ensureTableSchema(tx, table, canonicalColumns);
    console.log(`[Stream] ✅ Esquema de tabla ${table} verificado y corregido.`);

    // 2. Truncar la tabla para nuevos datos
    await tx.execute(sql.raw(`TRUNCATE TABLE ${table};`));
    console.log(`[Stream] ✅ Tabla ${table} truncada.`);
    onProgress(10);
    
    let fileHeaders: string[] = [];
    const headerIndexMap: { [key: string]: number } = {};
    let columnsToInsert: string[] = [];
    let isFirstRow = true;
    let processedRowCount = 0;
    const batchSize = 250;
    let batch: any[][] = [];

    const dataStream = createParserStream(fileName, r2Stream);
    
    let totalRowCount = 0; // Aproximación para el progreso
    
    for await (const rawRow of dataStream) {
        // NORMALIZACIÓN: Asegurar que la fila siempre sea un array
        const row = Array.isArray(rawRow) ? rawRow : Object.values(rawRow);
        
        if (isFirstRow) {
            fileHeaders = row.map((h: any) => String(h || '').trim().replace(/\s+/g, '_').replace(/-/g, '_').toLowerCase());
            fileHeaders.forEach((col, index) => { if(col) headerIndexMap[col] = index; });
            columnsToInsert = canonicalColumns.filter(col => headerIndexMap.hasOwnProperty(col));
            isFirstRow = false;
            if (columnsToInsert.length === 0) throw new Error(`No se encontraron columnas compatibles.`);
            continue;
        }

        const processedRow = processRowData(row, fileHeaders);
        const dbRow = columnsToInsert.map(colName => processedRow[headerIndexMap[colName]]);
        batch.push(dbRow);
        totalRowCount++;

        if (batch.length >= batchSize) {
            await insertBatch(tx, table, columnsToInsert, batch);
            processedRowCount += batch.length;
            onProgress(10 + (processedRowCount / (totalRowCount + batchSize)) * 80); // Progreso aproximado
            batch = [];
        }
    }

    if (batch.length > 0) {
        await insertBatch(tx, table, columnsToInsert, batch);
        processedRowCount += batch.length;
    }
    
    onProgress(100);
    console.log(`[Job ${jobId}] [Stream] ✅ Finalizado ${fileName}. Filas procesadas: ${processedRowCount}`);
}

// Nueva función para asegurar que el esquema de la tabla esté correcto
async function ensureTableSchema(tx: any, tableName: string, canonicalColumns: string[]) {
  // Crear la tabla si no existe
  const colDefs = canonicalColumns.map(col => `"${col}" TEXT`).join(', ');
  await tx.execute(sql.raw(`CREATE TABLE IF NOT EXISTS ${tableName} (${colDefs});`));

  // Obtener columnas existentes
  const existingColsResult = await tx.execute(sql.raw(`
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name = '${tableName}';
  `));
  const existingCols = existingColsResult.rows.map((r: any) => r.column_name);

  // Añadir columnas faltantes
  const missingCols = canonicalColumns.filter(col => !existingCols.includes(col));
  if (missingCols.length > 0) {
    console.log(`[Schema] Columnas faltantes en ${tableName}: ${missingCols.join(', ')}. Añadiendo...`);
    const addColQueries = missingCols.map(col => `ADD COLUMN IF NOT EXISTS "${col}" TEXT`).join(', ');
    await tx.execute(sql.raw(`ALTER TABLE ${tableName} ${addColQueries};`));
  }
}

// Funciones de ayuda
async function getR2FileStream(key: string): Promise<Readable> {
  const command = new GetObjectCommand({ Bucket: BUCKET_NAME, Key: key });
  const response = await r2Client.send(command);
  if (!response.Body) throw new Error('No se pudo descargar el archivo de R2');
  return response.Body as Readable;
}

function createParserStream(fileName: string, stream: Readable): Readable {
  const fileExtension = path.extname(fileName).toLowerCase();
  if (fileExtension === '.csv') {
    return stream.pipe(csvParser({ headers: false, separator: ';' }));
  } else if (fileExtension === '.xlsx') {
    const readable = new Readable({ objectMode: true });
    readable._read = () => {}; // No-op, ya que empujaremos datos manualmente

    const workbook = new Workbook();
    workbook.xlsx.read(stream).then(() => {
      const worksheet = workbook.worksheets[0];
      if (worksheet) {
        worksheet.eachRow((row, rowNumber) => {
          const values = row.values as any[];
          // exceljs usa un array 1-based, lo convertimos a 0-based
          readable.push(values.slice(1));
        });
      }
      readable.push(null); // Fin del stream
    }).catch(err => readable.emit('error', err));
    
    return readable;
  } else {
    throw new Error(`Formato de archivo no soportado: ${fileName}`);
  }
}

function processRowData(row: any[], headers: string[]): any[] {
  return row.map((value, index) => {
    const columnName = headers[index];
    if (dateColumns.includes(columnName)) {
      return convertExcelDate(value);
    }
    return value != null ? String(value) : null;
  });
}

function convertExcelDate(value: any): string | null {
  if (value === null || typeof value === 'undefined') return null;
  if (typeof value === 'object' && value instanceof Date) {
    return value.toISOString().split('T')[0];
  }
  if (typeof value === 'number' && value > 0 && value < 2958466) { // Rango de fechas de Excel
    const jsDate = new Date(Date.UTC(1899, 11, 30, 0, 0, 0, 0) + value * 86400000);
    return jsDate.toISOString().split('T')[0];
  }
  if (typeof value === 'string') {
    try {
      return new Date(value).toISOString().split('T')[0];
    } catch {
      return null;
    }
  }
  return null;
}

async function insertBatch(tx: any, table: string, columns: string[], batch: any[][]) {
  if (batch.length === 0) return;

  // 1. Mapear el lote de arrays a un lote de objetos, que es lo que Drizzle espera.
  const dataToInsert = batch.map(row => {
    const rowObject: Record<string, any> = {};
    columns.forEach((col, index) => {
      rowObject[col] = row[index];
    });
    return rowObject;
  });

  // 2. Usar el método de inserción nativo de Drizzle.
  // Drizzle se encargará de construir la consulta y manejar los parámetros de forma segura.
  // Esto es mucho más robusto que construir SQL crudo.
  // Usamos el `pgTable` correspondiente para que Drizzle conozca el schema.
  const tableSchema = table === 'table_ccm' ? tableCCM : tablePRR;
  await tx.insert(tableSchema).values(dataToInsert);
}

async function convertAllDateColumns(db: any) {
    for (const table in canonicalSchema) {
        for (const col of dateColumns) {
            try {
                const alterQuery = `
                    ALTER TABLE ${table}
                    ALTER COLUMN "${col}" TYPE DATE
                    USING CASE 
                        WHEN "${col}" IS NULL OR "${col}" = '' THEN NULL
                        ELSE "${col}"::DATE
                    END;
                `;
                await db.execute(sql.raw(alterQuery));
            } catch (error) {
                if (!(error instanceof Error && error.message.includes('does not exist'))) {
                  console.error(`[Stream] ❌ Error convirtiendo ${col} en ${table}:`, error);
                }
            }
        }
    }
} 