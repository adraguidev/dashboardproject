import { NextRequest, NextResponse } from 'next/server'
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3'
import { Pool } from 'pg'
import { Readable } from 'stream'
import { Workbook } from 'exceljs'
import csvParser from 'csv-parser'
import * as path from 'path'
import { v4 as uuidv4 } from 'uuid'
import { jobStatusManager } from '@/lib/redis'

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

// Columnas que deben ser DATE - exactamente como en Colab
const columnas_fecha = [
  "fechaexpendiente",
  "fechaetapaaprobacionmasivafin",
  "fechapre",
  "fecha_asignacion"
]

const conversiones = {
  "table_ccm": columnas_fecha,
  "table_prr": columnas_fecha
}

// Esquema canónico para asegurar que las tablas siempre tengan las columnas correctas
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
}

export async function POST(request: NextRequest) {
  console.log('🔄 Iniciando procesamiento de archivos desde R2...');
  
  const jobId = uuidv4();

  try {
    if (!process.env.DATABASE_DIRECT_URL) {
      throw new Error('Variable DATABASE_DIRECT_URL no configurada');
    }

    const body = await request.json();
    const { files, jobId: providedJobId } = body;

    // Usar el jobId proporcionado si existe, sino crear uno nuevo
    const actualJobId = providedJobId || jobId;

    if (!files || !Array.isArray(files) || files.length === 0) {
      return NextResponse.json({ error: 'Debes proporcionar información de los archivos a procesar.' }, { status: 400 });
    }

    // Iniciar el procesamiento en background sin esperar (no usar await)
    processFilesFromR2(actualJobId, files).catch(async (error) => {
      console.error(`[Job ${actualJobId}] ❌ Error en la ejecución principal del background:`, error);
      await jobStatusManager.update(actualJobId, { 
        status: 'error', 
        message: 'Error crítico en el worker.',
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    });

    console.log(`[Job ${actualJobId}] ✅ Tarea de procesamiento iniciada. Respondiendo inmediatamente.`);

    // Responder inmediatamente con HTTP 202
    return NextResponse.json({
      success: true,
      message: 'Procesamiento de archivos iniciado en background. Consulta el estado con el ID del trabajo.',
      jobId: actualJobId,
      status: 'processing_started',
      estimatedTime: '3-8 minutos'
    }, { status: 202 });

  } catch (error) {
    console.error(`[Job ${jobId}] ❌ Error al iniciar el procesamiento:`, error);
    return NextResponse.json({ 
      error: 'Error al iniciar el procesamiento', 
      details: error instanceof Error ? error.message : 'Error desconocido' 
    }, { status: 500 });
  }
}

// Lógica principal de procesamiento en background usando psycopg2 con COPY
async function processFilesFromR2(jobId: string, files: Array<{fileName: string, key: string, table: string}>) {
  await jobStatusManager.update(jobId, { status: 'in_progress', message: 'Iniciando procesamiento...', progress: 0 });
  console.log(`[Job ${jobId}] 🔄 Iniciando procesamiento en background con psycopg2 + COPY...`);
  
  // Usar el driver pg nativo con Pool para mejor performance
  const pool = new Pool({ 
    connectionString: process.env.DATABASE_DIRECT_URL!,
    max: 1, // Una sola conexión para evitar conflictos
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });

  let client;
  try {
    client = await pool.connect();
    
    for (const [index, fileInfo] of files.entries()) {
      const fileProgressStart = (index / files.length) * 100;
      const fileProgressEnd = ((index + 1) / files.length) * 100;

      try {
        const message = `Procesando archivo ${index + 1}/${files.length}: ${fileInfo.fileName}`;
        await jobStatusManager.update(jobId, { status: 'in_progress', message, progress: fileProgressStart });
        
        await processSingleFileWithCopy(client, fileInfo, jobId, (progress) => {
          const overallProgress = fileProgressStart + (progress / 100) * (fileProgressEnd - fileProgressStart);
          jobStatusManager.update(jobId, { status: 'in_progress', message, progress: overallProgress });
        });
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
        await jobStatusManager.update(jobId, { status: 'error', message: `Error en ${fileInfo.fileName}`, error: errorMessage });
        console.error(`[Job ${jobId}] ❌ Error procesando ${fileInfo.fileName}:`, error);
        return; // Detener el proceso si un archivo falla
      }
    }

    // Conversión de fechas post-procesamiento - exactamente como en Colab
    console.log(`[Job ${jobId}] 🗓️ Iniciando conversión de columnas de fecha...`);
    await jobStatusManager.update(jobId, { status: 'in_progress', message: 'Convirtiendo columnas de fecha...', progress: 90 });
    await convertirColumnasFecha(client, conversiones);
    console.log(`[Job ${jobId}] ✅ Conversión de fechas completada.`);
    
    await jobStatusManager.update(jobId, { 
      status: 'completed', 
      message: 'Procesamiento completado exitosamente.',
      progress: 100 
    });
    
  } catch (error) {
    console.error(`[Job ${jobId}] ❌ Error general en procesamiento:`, error);
    await jobStatusManager.update(jobId, { 
      status: 'error', 
      message: 'Error general en el procesamiento.',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  } finally {
    if (client) client.release();
    await pool.end();
  }
}

// Procesa un único archivo usando COPY - inspirado en el código de Colab
async function processSingleFileWithCopy(
  client: any, 
  fileInfo: {fileName: string, key: string, table: string}, 
  jobId: string, 
  onProgress: (progress: number) => void
) {
  const { fileName, key, table } = fileInfo;
  console.log(`[Job ${jobId}] 🚀 Procesando con COPY: ${fileName}`);

  // 1. Descargar archivo desde R2
  onProgress(5);
  const fileBuffer = await downloadFileFromR2(key);
  console.log(`[Job ${jobId}] ✅ Archivo descargado desde R2: ${fileName}`);

  // 2. Leer archivo según extensión
  onProgress(15);
  const rawData = await readFileAuto(fileBuffer, fileName);
  console.log(`[Job ${jobId}] ✅ Archivo leído: ${rawData.length} filas`);

  // 3. Limpiar nombres de columnas - exactamente como en Colab
  onProgress(25);
  const { columns, rows } = cleanColumnNames(rawData);
  console.log(`[Job ${jobId}] ✅ Columnas limpiadas: ${columns.length} columnas`);

  // 4. Cargar a PostgreSQL usando COPY - exactamente como en Colab
  onProgress(35);
  const insertedRows = await copyDataFrameToPostgres(columns, rows, table, client);
  console.log(`[Job ${jobId}] ✅ ${insertedRows} filas cargadas con COPY en '${table}'`);

  onProgress(100);
}

// Descargar archivo desde R2
async function downloadFileFromR2(key: string): Promise<Buffer> {
  const command = new GetObjectCommand({ Bucket: BUCKET_NAME, Key: key });
  const response = await r2Client.send(command);
  if (!response.Body) throw new Error('No se pudo descargar el archivo de R2');
  
  const stream = response.Body as Readable;
  
  // Solución correcta para AWS SDK v3 basada en la documentación oficial
  const chunks: Buffer[] = [];
  
  return new Promise((resolve, reject) => {
    stream.on('data', (chunk: any) => chunks.push(chunk));
    stream.on('end', () => resolve(Buffer.concat(chunks as any)));
    stream.on('error', reject);
  });
}

// Leer archivo según extensión - adaptado del código de Colab
async function readFileAuto(fileBuffer: Buffer, fileName: string): Promise<any[][]> {
  const fileExtension = path.extname(fileName).toLowerCase();
  console.log(`🚀 Iniciando lectura de archivo: ${fileName}`);

  if (fileExtension === '.csv') {
    return new Promise((resolve, reject) => {
      const data: any[][] = [];
      const stream = Readable.from(fileBuffer);
      
      stream
        .pipe(csvParser({ 
          headers: false,
          separator: ';'
        })) 
        .on('data', (row: any) => {
          data.push(Object.values(row));
        })
        .on('end', () => {
          console.log(`✅ Lectura de CSV completada: ${data.length} filas`);
          resolve(data);
        })
        .on('error', reject);
    });
  } 
  else if (fileExtension === '.xlsx' || fileExtension === '.xls') {
    try {
      const workbook = new Workbook();
      await workbook.xlsx.load(fileBuffer as any);
      const worksheet = workbook.worksheets[0];
      
      if (!worksheet) throw new Error("El archivo no contiene hojas o no pudo ser leído.");
      
      const data: any[][] = [];
      worksheet.eachRow((row, rowNumber) => {
        const values = row.values as any[];
        // ExcelJS usa un array 1-based, lo convertimos a 0-based
        data.push(values.slice(1));
      });

      if (data.length === 0) throw new Error("El archivo parece estar vacío.");
      
      console.log(`✅ Lectura de Excel completada: ${data.length} filas`);
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      throw new Error(`Error al procesar el archivo Excel (${fileName}): ${errorMessage}`);
    }
  } else {
    throw new Error(`Formato de archivo no soportado: ${fileExtension}`);
  }
}

// Limpiar nombres de columnas - exactamente como en Colab
function cleanColumnNames(data: any[][]): { columns: string[], rows: any[][] } {
  if (data.length === 0) throw new Error("Archivo vacío");
  
  const originalColumns = data[0];
  const columns = originalColumns.map((col: any) => 
    String(col).trim().replace(/\s+/g, '_').replace(/-/g, '_').toLowerCase()
  );
  
  const rows = data.slice(1); // Todos los datos excepto el header
  
  return { columns, rows };
}

// Cargar DataFrame a PostgreSQL usando COPY - exactamente como en Colab
async function copyDataFrameToPostgres(
  columns: string[], 
  rows: any[][], 
  tableName: string, 
  client: any
): Promise<number> {
  try {
    console.log(`🔄 Procesando tabla con COPY: ${tableName}`);
    
    // Crear tabla si no existe con todas las columnas como TEXT
    const colDefs = columns.map(col => `"${col}" TEXT`).join(', ');
    const createTableQuery = `CREATE TABLE IF NOT EXISTS ${tableName} (${colDefs});`;
    await client.query(createTableQuery);
    
    console.log(`📋 Tabla ${tableName} preparada con ${columns.length} columnas`);
    
    // Truncar tabla antes de insertar - exactamente como en Colab
    const truncateQuery = `TRUNCATE TABLE ${tableName};`;
    await client.query(truncateQuery);
    console.log(`🗑️ Tabla ${tableName} truncada`);
    
    // Usar COPY para inserción masiva - LA CLAVE DEL PERFORMANCE
    const copyQuery = `COPY ${tableName} FROM STDIN WITH (FORMAT CSV)`;
    
    // Convertir datos a formato CSV en memoria
    const csvData = rows.map(row => {
      // Asegurar que la fila tenga el mismo número de columnas
      const paddedRow = Array(columns.length).fill('');
      for (let i = 0; i < Math.min(row.length, columns.length); i++) {
        const value = row[i];
        paddedRow[i] = value != null ? String(value).replace(/"/g, '""') : '';
      }
      return paddedRow.map(val => `"${val}"`).join(',');
    }).join('\n');

    // Ejecutar COPY - esto es 300x más rápido que INSERT individual
    const copyStream = client.query(copyQuery);
    copyStream.write(csvData);
    copyStream.end();
    
    await new Promise((resolve, reject) => {
      copyStream.on('end', resolve);
      copyStream.on('error', reject);
    });
    
    console.log(`✅ ${rows.length} filas cargadas con COPY en '${tableName}'`);
    return rows.length;
    
  } catch (error) {
    console.error(`❌ Error en COPY a '${tableName}':`, error);
    throw error;
  }
}

// Convertir columnas a tipo DATE - exactamente como en Colab
async function convertirColumnasFecha(client: any, conversiones: Record<string, string[]>) {
  for (const [tabla, columnas] of Object.entries(conversiones)) {
    console.log(`\n🔄 Procesando tabla: ${tabla}`);
    
    for (const col of columnas) {
      try {
        console.log(` - Convirtiendo columna: ${col} → DATE...`);
        
        // Verificar si la columna existe antes de intentar convertirla
        const checkColumnQuery = `
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = '${tabla}' AND column_name = '${col}';
        `;
        const columnExists = await client.query(checkColumnQuery);
        
        if (columnExists.rows.length > 0) {
          // Primero verificar si ya es tipo DATE
          const checkTypeQuery = `
            SELECT data_type 
            FROM information_schema.columns 
            WHERE table_name = '${tabla}' AND column_name = '${col}';
          `;
          const columnTypeResult = await client.query(checkTypeQuery);
          
          if (columnTypeResult.rows[0]?.data_type === 'date') {
            console.log(`   ✅ ${col} ya es tipo DATE, omitiendo conversión.`);
          } else {
            const alterQuery = `
              ALTER TABLE ${tabla}
              ALTER COLUMN "${col}" TYPE DATE
              USING CASE 
                WHEN "${col}" IS NULL OR "${col}" = '' THEN NULL
                ELSE "${col}"::DATE
              END;
            `;
            await client.query(alterQuery);
            console.log(`   ✅ Columna ${col} convertida a tipo DATE.`);
          }
        } else {
          console.log(`   ⚠️ La columna ${col} no existe en la tabla ${tabla}.`);
        }
      } catch (error) {
        console.error(`   ❌ Error al convertir columna ${col} a tipo DATE:`, error);
      }
    }
  }
} 