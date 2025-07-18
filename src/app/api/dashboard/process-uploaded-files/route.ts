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

// La URL de tu worker desplegado.
// Es buena práctica mover esto a una variable de entorno.
const WORKER_URL = 'https://worker-processor.aaguirreb16.workers.dev';

interface FileToProcess {
  key: string;
  table: string;
}

interface ProcessFilesBody {
  files: FileToProcess[];
}

/**
 * Este endpoint ahora actúa como un "disparador" para el workflow de GitHub Actions.
 * Su única responsabilidad es recibir la información del archivo y enviar un
 * evento "repository_dispatch" a la API de GitHub.
 */
export async function POST(request: NextRequest) {
	// Obtener las credenciales de GitHub desde las variables de entorno de Heroku
	const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
	const GITHUB_USER = process.env.GITHUB_USER;
	const GITHUB_REPO = process.env.GITHUB_REPO;

	if (!GITHUB_TOKEN || !GITHUB_USER || !GITHUB_REPO) {
		console.error('Faltan variables de entorno de GitHub en Heroku.');
		return NextResponse.json({ error: 'Configuración del servidor incompleta.' }, { status: 500 });
	}

	try {
		const { files }: ProcessFilesBody = await request.json();

		if (!files || !Array.isArray(files) || files.length === 0) {
			return NextResponse.json({ error: 'No se proporcionaron archivos para procesar.' }, { status: 400 });
		}

		// Generar un único ID de trabajo para todo el lote de subida
		const jobId = crypto.randomUUID();

		const dispatchUrl = `https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/dispatches`;
		
		const dispatchPromises = files.map(file => {
			console.log(`Disparando evento para el archivo: ${file.key} con JobID: ${jobId}`);
			return fetch(dispatchUrl, {
				method: 'POST',
				headers: {
					'Accept': 'application/vnd.github.v3+json',
					'Authorization': `token ${GITHUB_TOKEN}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					event_type: 'process-file-event',
					client_payload: {
						file_key: file.key,
						table_name: file.table,
						job_id: jobId, // Pasamos el ID del job
					},
				}),
			});
		});

		// Esperamos a que todas las llamadas a la API de GitHub se completen
		const responses = await Promise.all(dispatchPromises);

		// Verificamos si alguna de las llamadas falló
		for (const res of responses) {
			if (!res.ok) {
				const errorBody = await res.text();
				console.error(`Error al disparar el workflow de GitHub: ${res.status} ${res.statusText}`, errorBody);
				throw new Error('No se pudo iniciar el proceso de carga de archivos.');
			}
		}

		// Devolvemos el ID del job al frontend
		return NextResponse.json(
			{
				message: 'El proceso de carga ha sido iniciado.',
				jobId: jobId, // Clave para que el frontend pueda consultar el estado
			},
			{ status: 202 }
		);
	} catch (error) {
		console.error('Error en el endpoint de disparo de workflow:', error);
		const errorMessage = error instanceof Error ? error.message : 'Error desconocido.';
		return NextResponse.json({ error: 'Error interno del servidor.', details: errorMessage }, { status: 500 });
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

// Procesa un único archivo optimizado para memoria
async function processSingleFileWithCopy(
  client: any, 
  fileInfo: {fileName: string, key: string, table: string}, 
  jobId: string, 
  onProgress: (progress: number) => void
) {
  const { fileName, key, table } = fileInfo;
  console.log(`[Job ${jobId}] 🚀 Procesando optimizado para memoria: ${fileName}`);

  try {
    // 1. Descargar archivo desde R2
    onProgress(5);
    const fileBuffer = await downloadFileFromR2(key);
    console.log(`[Job ${jobId}] ✅ Archivo descargado desde R2: ${fileName}`);

    // 2. Procesar archivo por chunks para evitar problemas de memoria
    onProgress(15);
    await processFileInChunks(fileBuffer, fileName, table, client, jobId, onProgress);
    
    onProgress(100);
  } catch (error) {
    console.error(`[Job ${jobId}] ❌ Error procesando archivo:`, error);
    throw error;
  }
}

// Nueva función para procesar archivos por chunks y evitar problemas de memoria
async function processFileInChunks(
  fileBuffer: Buffer, 
  fileName: string, 
  tableName: string, 
  client: any, 
  jobId: string,
  onProgress: (progress: number) => void
) {
  console.log(`[Job ${jobId}] 🔄 Procesando archivo por chunks para optimizar memoria`);
  
  // Primero leer headers del CSV para crear tabla dinámicamente
  onProgress(20);
  console.log(`[Job ${jobId}] 🔍 Leyendo headers del CSV para crear tabla dinámicamente...`);
  
  let csvHeaders: string[] = [];
  
  // Leer solo la primera línea para obtener headers
  if (fileName.toLowerCase().endsWith('.csv')) {
    const firstLine = fileBuffer.toString('utf8').split('\n')[0];
    csvHeaders = firstLine.split(';').map(header => 
      header.trim().replace(/"/g, '').replace(/\s+/g, '_').replace(/-/g, '_').toLowerCase()
    );
  } else {
    // Para Excel, usar headers predeterminados que coinciden con la imagen
    csvHeaders = [
      'textbox4', 'dependencia', 'anio', 'mes', 'numerotramite', 'ultimaetapa',
      'fechaexpendiente', 'fechaetapaaprobacionmasivafin', 'fechapre', 'operadorpre',
      'estadopre', 'estadotramite', 'archivo_origen', 'operador', 'fecha_asignacion',
      'modalidad', 'regimen', 'meta_antigua', 'meta_nueva', 'equipo'
    ];
  }
  
  console.log(`[Job ${jobId}] 📋 Headers detectados: ${csvHeaders.join(', ')}`);
  
  // Crear tabla dinámicamente con todas las columnas como TEXT
  const colDefs = csvHeaders.map(col => `"${col}" TEXT`).join(', ');
  const createTableQuery = `CREATE TABLE IF NOT EXISTS ${tableName} (${colDefs});`;
  
  console.log(`[Job ${jobId}] 🏗️ Creando tabla: ${createTableQuery}`);
  await client.query(createTableQuery);
  
  // Truncar tabla
  const truncateQuery = `TRUNCATE TABLE ${tableName};`;
  await client.query(truncateQuery);
  console.log(`[Job ${jobId}] ✅ Tabla ${tableName} preparada y truncada`);
  
  onProgress(30);
  
  // Leer archivo línea por línea para evitar cargar todo en memoria
  const fileExtension = fileName.toLowerCase().endsWith('.csv') ? 'csv' : 'excel';
  
  if (fileExtension === 'csv') {
    await processCSVInChunks(fileBuffer, tableName, csvHeaders, client, jobId, onProgress);
  } else {
    // Para Excel, tenemos que cargar en memoria pero optimizamos el procesamiento
    const rawData = await readFileAuto(fileBuffer, fileName);
    console.log(`[Job ${jobId}] ✅ Archivo Excel leído: ${rawData.length} filas`);
    
    const { columns, rows } = cleanColumnNames(rawData);
    console.log(`[Job ${jobId}] ✅ Columnas limpiadas: ${columns.length} columnas`);
    
    onProgress(50);
    const insertedRows = await copyDataFrameToPostgres(columns, rows, tableName, client);
    console.log(`[Job ${jobId}] ✅ ${insertedRows} filas procesadas en '${tableName}'`);
  }
}

// Procesar CSV por chunks usando streams
async function processCSVInChunks(
  fileBuffer: Buffer, 
  tableName: string, 
  columns: string[], 
  client: any, 
  jobId: string,
  onProgress: (progress: number) => void
) {
  return new Promise((resolve, reject) => {
    
    let rowCount = 0;
    let batch: any[] = [];
    const batchSize = 100; // Lotes pequeños para Heroku
    let isFirstRow = true;
    let actualColumns: string[] = [];
    
    const stream = Readable.from(fileBuffer)
      .pipe(csvParser({ 
        headers: false,
        separator: ';'
      }));
    
    stream.on('data', async (row: any) => {
      try {
        if (isFirstRow) {
          // Primera fila son los headers
          actualColumns = Object.values(row).map((col: any) => 
            String(col).trim().replace(/\s+/g, '_').replace(/-/g, '_').toLowerCase()
          );
          isFirstRow = false;
          console.log(`[Job ${jobId}] ✅ Headers detectados: ${actualColumns.length} columnas`);
          return;
        }
        
        // Procesar fila de datos
        const rowData = Object.values(row);
        const paddedRow = Array(columns.length).fill(null);
        
        // Mapear datos a columnas conocidas
        for (let i = 0; i < Math.min(rowData.length, columns.length); i++) {
          const value = rowData[i];
          paddedRow[i] = value != null ? String(value) : null;
        }
        
        batch.push(paddedRow);
        rowCount++;
        
        // Procesar lote cuando esté lleno
        if (batch.length >= batchSize) {
          stream.pause(); // Pausar el stream mientras procesamos
          
          await insertBatch(client, tableName, columns, batch);
          console.log(`[Job ${jobId}] 📊 Procesadas ${rowCount} filas`);
          
          // Actualizar progreso (30% base + 60% del procesamiento)
          const progressPercent = 30 + (rowCount / 600000) * 60; // Estimamos máximo 600k filas
          onProgress(Math.min(progressPercent, 90));
          
          // Liberar memoria cada 10 lotes
          if (Math.floor(rowCount / batchSize) % 10 === 0) {
            if (global.gc) {
              global.gc();
            }
            // Pequeña pausa para Heroku
            await new Promise(resolve => setTimeout(resolve, 10));
          }
          
          batch = []; // Limpiar lote
          stream.resume(); // Reanudar el stream
        }
      } catch (error) {
        console.error(`[Job ${jobId}] ❌ Error procesando fila:`, error);
        stream.destroy();
        reject(error);
      }
    });
    
    stream.on('end', async () => {
      try {
        // Procesar último lote si queda algo
        if (batch.length > 0) {
          await insertBatch(client, tableName, columns, batch);
        }
        
        console.log(`[Job ${jobId}] ✅ CSV procesado completamente: ${rowCount} filas`);
        onProgress(90);
        resolve(rowCount);
      } catch (error) {
        reject(error);
      }
    });
    
    stream.on('error', (error: any) => {
      console.error(`[Job ${jobId}] ❌ Error en stream CSV:`, error);
      reject(error);
    });
  });
}

// Helper para insertar lotes
async function insertBatch(client: any, tableName: string, columns: string[], batch: any[][]) {
  if (batch.length === 0) return;
  
  const valueGroups = [];
  const allValues = [];
  
  for (let rowIndex = 0; rowIndex < batch.length; rowIndex++) {
    const row = batch[rowIndex];
    const startIndex = rowIndex * columns.length;
    const placeholders = columns.map((_, colIndex) => `$${startIndex + colIndex + 1}`).join(', ');
    valueGroups.push(`(${placeholders})`);
    allValues.push(...row);
  }
  
  const columnNames = columns.map(col => `"${col}"`).join(', ');
  const insertQuery = `INSERT INTO ${tableName} (${columnNames}) VALUES ${valueGroups.join(', ')}`;
  
  await client.query(insertQuery, allValues);
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

// Cargar DataFrame a PostgreSQL usando INSERT en lotes - optimizado para memoria
async function copyDataFrameToPostgres(
  columns: string[], 
  rows: any[][], 
  tableName: string, 
  client: any
): Promise<number> {
  try {
    console.log(`🔄 Procesando tabla con INSERT en lotes: ${tableName}`);
    
    // Crear tabla si no existe con todas las columnas como TEXT
    const colDefs = columns.map(col => `"${col}" TEXT`).join(', ');
    const createTableQuery = `CREATE TABLE IF NOT EXISTS ${tableName} (${colDefs});`;
    await client.query(createTableQuery);
    
    console.log(`📋 Tabla ${tableName} preparada con ${columns.length} columnas`);
    
    // Truncar tabla antes de insertar
    const truncateQuery = `TRUNCATE TABLE ${tableName};`;
    await client.query(truncateQuery);
    console.log(`🗑️ Tabla ${tableName} truncada`);
    
    // Usar INSERT en lotes pequeños para evitar problemas de memoria en Heroku
    const batchSize = 100; // Lotes de 100 filas para mantener memoria bajo 512MB
    let insertedRows = 0;
    
    console.log(`📊 Insertando ${rows.length} filas en lotes de ${batchSize}...`);
    
    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize);
      
      // Preparar placeholders y valores para el lote
      const valueGroups = [];
      const allValues = [];
      
      for (let rowIndex = 0; rowIndex < batch.length; rowIndex++) {
        const row = batch[rowIndex];
        
        // Asegurar que la fila tenga el mismo número de columnas
        const paddedRow = Array(columns.length).fill(null);
        for (let j = 0; j < Math.min(row.length, columns.length); j++) {
          const value = row[j];
          paddedRow[j] = value != null ? String(value) : null;
        }
        
        // Crear placeholders para esta fila ($1, $2, $3, etc.)
        const startIndex = rowIndex * columns.length;
        const placeholders = columns.map((_, colIndex) => `$${startIndex + colIndex + 1}`).join(', ');
        valueGroups.push(`(${placeholders})`);
        
        // Añadir valores al array
        allValues.push(...paddedRow);
      }
      
      // Ejecutar INSERT del lote
      const columnNames = columns.map(col => `"${col}"`).join(', ');
      const insertQuery = `INSERT INTO ${tableName} (${columnNames}) VALUES ${valueGroups.join(', ')}`;
      
      await client.query(insertQuery, allValues);
      insertedRows += batch.length;
      
      // Log progreso cada 10 lotes
      if ((Math.floor(i / batchSize) + 1) % 10 === 0) {
        console.log(`📊 Procesado lote ${Math.floor(i / batchSize) + 1}, total: ${insertedRows} filas`);
        
        // Forzar garbage collection cada 10 lotes para liberar memoria
        if (global.gc) {
          global.gc();
        }
        
        // Pequeña pausa para evitar saturar Heroku
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      
      // Liberar memoria del lote procesado
      batch.length = 0;
    }
    
    console.log(`✅ ${insertedRows} filas cargadas con INSERT en lotes en '${tableName}'`);
    return insertedRows;
    
  } catch (error) {
    console.error(`❌ Error en INSERT a '${tableName}':`, error);
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