import { NextRequest, NextResponse } from 'next/server'
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3'
import { neon } from '@neondatabase/serverless'
import { Readable } from 'stream'
import { Workbook } from 'exceljs'
import csvParser from 'csv-parser'
import * as path from 'path'
import { drizzle } from 'drizzle-orm/neon-http'
import { sql } from 'drizzle-orm'

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

export async function POST(request: NextRequest) {
  console.log('🔄 Iniciando procesamiento de archivos desde R2...');
  
  try {
    // Verificar variables de entorno
    if (!process.env.DATABASE_DIRECT_URL) {
      throw new Error('Variable DATABASE_DIRECT_URL no configurada');
    }

    const body = await request.json();
    const { files } = body;

    if (!files || !Array.isArray(files) || files.length === 0) {
      return NextResponse.json(
        { error: 'Debes proporcionar información de los archivos a procesar.' },
        { status: 400 }
      );
    }

    // Iniciar procesamiento en background (NO ESPERAR)
    processFilesFromR2(files).catch(error => {
      console.error('❌ Error en procesamiento desde R2:', error);
    });

    console.log('✅ Procesamiento iniciado desde R2. Respondiendo inmediatamente.');

    // Responder inmediatamente
    return NextResponse.json({
      success: true,
      message: 'Procesamiento de archivos iniciado desde R2.',
      files: files.map(f => ({ fileName: f.fileName, table: f.table })),
      status: 'processing',
      estimatedTime: '3-8 minutos para completarse',
      note: 'Los datos aparecerán en el dashboard automáticamente cuando esté listo.'
    }, { status: 202 }); // 202 Accepted

  } catch (error) {
    console.error('❌ Error iniciando procesamiento desde R2:', error);
    
    return NextResponse.json(
      { 
        error: 'Error al procesar archivos desde R2',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}

// Lógica principal de procesamiento en background
async function processFilesFromR2(files: Array<{fileName: string, key: string, table: string}>) {
  console.log('[Stream] 🔄 Iniciando procesamiento en background...');
  const db = drizzle(neon(process.env.DATABASE_DIRECT_URL!));

  for (const fileInfo of files) {
    try {
      // Cada archivo se procesa en su propia transacción para aislar fallos.
      await db.transaction(async (tx) => {
        console.log(`[Transaction] 🏁 Iniciando transacción para ${fileInfo.fileName}`);
        await processSingleFileStream(tx, fileInfo);
        console.log(`[Transaction] ✅ COMMIT para ${fileInfo.fileName}`);
      });
    } catch (error) {
      console.error(`[Transaction] ❌ Error fatal en transacción para ${fileInfo.fileName}. Se hizo ROLLBACK.`, error);
    }
  }

  // Conversión de fechas post-procesamiento para todas las tablas
  console.log('[Stream] 🗓️  Iniciando conversión de columnas de fecha a tipo DATE...');
  await convertAllDateColumns(db); // Usar la conexión principal para esto
  console.log('[Stream] ✅ Conversión de fechas completada.');
}

// Procesa un único archivo usando streams dentro de una transacción
async function processSingleFileStream(tx: any, fileInfo: {fileName: string, key: string, table: string}) {
    const { fileName, key, table } = fileInfo;
    console.log(`[Stream] 🚀 Comenzando a procesar: ${fileName} para la tabla ${table}`);

    const r2Stream = await getR2FileStream(key);
    const canonicalColumns = canonicalSchema[table as keyof typeof canonicalSchema];
    
    // Preparar la tabla: crearla si no existe con el esquema canónico y truncarla
    const colDefs = canonicalColumns.map(col => `"${col}" TEXT`).join(', ');
    await tx.execute(sql.raw(`CREATE TABLE IF NOT EXISTS ${table} (${colDefs});`));
    await tx.execute(sql.raw(`TRUNCATE TABLE ${table};`));
    console.log(`[Stream] ✅ Tabla ${table} preparada y limpia.`);
    
    let fileHeaders: string[] = [];
    const headerIndexMap: { [key: string]: number } = {};
    let columnsToInsert: string[] = [];
    let isFirstRow = true;
    let rowCount = 0;
    let processedRowCount = 0;
    const batchSize = 250;
    let batch: any[][] = [];

    const dataStream = createParserStream(fileName, r2Stream);

    console.log(`[Stream] 🧠 Creado parser para ${fileName}, iniciando iteración...`);

    for await (const row of dataStream) {
        rowCount++;
        if (isFirstRow) {
            fileHeaders = row.map((h: any) => String(h || '').trim().replace(/\s+/g, '_').replace(/-/g, '_').toLowerCase());
            fileHeaders.forEach((col, index) => { if(col) headerIndexMap[col] = index; });
            columnsToInsert = canonicalColumns.filter(col => headerIndexMap.hasOwnProperty(col));
            isFirstRow = false;

            if (columnsToInsert.length === 0) {
                throw new Error(`No se encontraron columnas compatibles en el archivo ${fileName}.`);
            }
            console.log(`[Stream] 🗺️  Mapeadas ${columnsToInsert.length} columnas.`);
            continue;
        }

        const processedRow = processRowData(row, fileHeaders);
        const dbRow = columnsToInsert.map(colName => processedRow[headerIndexMap[colName]]);
        batch.push(dbRow);

        if (batch.length >= batchSize) {
            await insertBatch(tx, table, columnsToInsert, batch);
            processedRowCount += batch.length;
            console.log(`[Stream] 📦 Lote de ${batch.length} insertado. Total: ${processedRowCount}`);
            batch = [];
        }
    }

    if (batch.length > 0) {
        await insertBatch(tx, table, columnsToInsert, batch);
        processedRowCount += batch.length;
    }

    console.log(`[Stream] ✅ Finalizado ${fileName}. Total filas leídas: ${rowCount - 1}, filas procesadas: ${processedRowCount}`);
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
    const valueGroups = [];
    const allValues = [];
    let placeholderIndex = 1;

    for (const row of batch) {
        const placeholders = [];
        for (const value of row) {
            placeholders.push(`$${placeholderIndex++}`);
            allValues.push(value);
        }
        valueGroups.push(`(${placeholders.join(', ')})`);
    }

    const columnNames = columns.map(col => `"${col}"`).join(', ');
    const query = `INSERT INTO ${table} (${columnNames}) VALUES ${valueGroups.join(', ')}`;
    
    await tx.execute(sql.raw(query), allValues);
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