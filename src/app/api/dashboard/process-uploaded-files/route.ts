import { NextRequest, NextResponse } from 'next/server'
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3'
import { neon } from '@neondatabase/serverless'
import * as XLSX from 'xlsx'
import { Readable } from 'stream'
import { getJsDateFromExcel } from 'excel-date-to-js'
import * as path from 'path'
import csvParser from 'csv-parser'

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

// Columnas que deben ser DATE
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

// Función para procesar archivos desde R2 en background
async function processFilesFromR2(files: Array<{fileName: string, key: string, table: string}>) {
  console.log('🔄 Procesando archivos desde R2 en background...');
  
  try {
    const sql = neon(process.env.DATABASE_DIRECT_URL!);
    const processedTables = [];

    for (const fileInfo of files) {
      console.log(`📁 Procesando ${fileInfo.fileName} desde R2...`);
      
      // Descargar archivo de R2
      const fileBuffer = await downloadFromR2(fileInfo.key);
      
      // Procesar archivo
      const rawData = await readFileAuto(fileBuffer, fileInfo.fileName);
      const { columns, rows } = cleanColumnNames(rawData);
      
      console.log(`📊 ${fileInfo.table}: ${rows.length} filas, ${columns.length} columnas`);
      
      // Cargar a base de datos
      const insertedRows = await copyDataFrameToPostgres(columns, rows, fileInfo.table, sql);
      processedTables.push({
        table: fileInfo.table,
        rows: insertedRows,
        columns: columns.length
      });
    }

    // Convertir columnas de fechas
    console.log('🗓️ Convirtiendo columnas de fecha...');
    await convertirColumnasFecha(sql, conversiones);

    const totalRows = processedTables.reduce((sum, table) => sum + table.rows, 0);
    console.log(`🎉 ¡Procesamiento completado! ${totalRows} registros procesados.`);

  } catch (error) {
    console.error('❌ Error crítico en procesamiento desde R2:', error);
  }
}

// Función para descargar archivo de R2
async function downloadFromR2(key: string): Promise<Buffer> {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key
  });
  
  const response = await r2Client.send(command);
  
  if (!response.Body) {
    throw new Error('No se pudo descargar el archivo de R2');
  }

  // Convertir stream a buffer
  const chunks: Buffer[] = [];
  const stream = response.Body as Readable;
  
  return new Promise((resolve, reject) => {
    stream.on('data', (chunk: Buffer) => chunks.push(chunk));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });
}

// Incluir las funciones de procesamiento necesarias aquí
// [Las funciones readFileAuto, cleanColumnNames, copyDataFrameToPostgres, convertirColumnasFecha]
// se mantendrían igual que en el archivo original

// Función para detectar si un valor es un número serial de Excel (fecha)
function isExcelDateSerial(value: any): boolean {
  return typeof value === 'number' && 
         value > 0 && 
         value < 100000 && 
         Number.isInteger(value * 86400)
}

// Función para convertir fechas de Excel a formato ISO string
function convertExcelDateToISO(value: any): string | null {
  try {
    if (isExcelDateSerial(value)) {
      const jsDate = getJsDateFromExcel(value)
      return jsDate.toISOString().split('T')[0]
    }
    
    if (typeof value === 'string' && value.trim()) {
      const parts = value.split('/');
      if (parts.length === 3) {
        const [day, month, year] = parts;
        const formattedDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        const parsed = new Date(formattedDate);
        if (!isNaN(parsed.getTime())) {
          return parsed.toISOString().split('T')[0];
        }
      }
      
      const parsed = new Date(value)
      if (!isNaN(parsed.getTime())) {
        return parsed.toISOString().split('T')[0]
      }
    }
    
    return null
  } catch (error) {
    console.warn(`Error convirtiendo fecha Excel: ${value}`, error)
    return null
  }
}

// Función para procesar y limpiar datos incluyendo conversión de fechas de Excel
function processRowData(columns: string[], row: any[], tableName: string, rowIndex: number = -1): any[] {
  const dateColumns = conversiones[tableName as keyof typeof conversiones] || []
  let dateConversions = 0
  
  const processedRow = row.map((value, index) => {
    const columnName = columns[index]
    
    if (dateColumns.includes(columnName)) {
      const convertedDate = convertExcelDateToISO(value)
      if (convertedDate) {
        dateConversions++
        if (rowIndex === 0) {
          console.log(`🔄 Fecha convertida en ${columnName}: ${value} → ${convertedDate}`)
        }
        return convertedDate;
      } else {
        if (rowIndex === 0 && value != null && value !== '') {
          console.log(`⚠️ No se pudo convertir fecha en ${columnName}: ${value}, se usará NULL.`)
        }
        return null;
      }
    }
    
    return value != null ? String(value) : null
  })
  
  if (rowIndex === 0 && dateConversions > 0) {
    console.log(`✅ Convertidas ${dateConversions} fechas de Excel en la primera fila`)
  }
  
  return processedRow
}

// Lógica de lectura unificada: Soporta CSV, XLSX y XLS
async function readFileAuto(fileBuffer: Buffer, fileName: string): Promise<any[][]> {
  const fileExtension = path.extname(fileName).toLowerCase();
  console.log(`🚀 Iniciando lectura de archivo: ${fileName}.`);

  if (fileExtension === '.csv') {
    return new Promise((resolve, reject) => {
      console.log("🧠 Usando el parser de streaming 'csv-parser'.");
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
          console.log(`✅ Lectura de CSV completada. ${data.length} filas.`);
          resolve(data);
        })
        .on('error', (error: Error) => {
          console.error('❌ Error durante el streaming del CSV:', error);
          reject(new Error(`Error al procesar el archivo CSV: ${error.message}`));
        });
    });
  } 
  else if (fileExtension === '.xlsx' || fileExtension === '.xls') {
    console.log(`🧠 Usando el lector de Excel en memoria (SheetJS) para ${fileExtension}.`);
    try {
      const workbook = XLSX.read(fileBuffer, { type: 'buffer', cellFormula: false, cellNF: false, cellStyles: false });
      const sheetName = workbook.SheetNames[0];
      if (!sheetName) throw new Error("El archivo no contiene hojas o no pudo ser leído.");
      
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

      if (!data || data.length === 0) throw new Error("El archivo parece estar vacío.");
      
      console.log(`✅ Lectura de Excel completada. ${data.length} filas.`);
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      throw new Error(`Error al procesar el archivo Excel (${fileName}): ${errorMessage}`);
    }
  } else {
    throw new Error(`Formato de archivo no soportado: ${fileExtension}`);
  }
}

// Función para limpiar nombres de columnas
function cleanColumnNames(data: any[][]): { columns: string[], rows: any[][] } {
  if (data.length === 0) throw new Error("Archivo vacío")
  
  const originalColumns = data[0]
  const columns = originalColumns.map((col: any) => 
    String(col).trim().replace(/\s+/g, '_').replace(/-/g, '_').toLowerCase()
  )
  
  const rows = data.slice(1)
  
  return { columns, rows }
}

// Función para cargar DataFrame a PostgreSQL
async function copyDataFrameToPostgres(
  columns: string[], 
  rows: any[][], 
  tableName: string, 
  sql: any
): Promise<number> {
  try {
    console.log(`🔄 Procesando tabla: ${tableName}`)
    
    // Crear tabla si no existe con todas las columnas como TEXT
    const colDefs = columns.map(col => `"${col}" TEXT`).join(', ')
    const createTableQuery = `CREATE TABLE IF NOT EXISTS ${tableName} (${colDefs});`
    await sql.query(createTableQuery)
    
    console.log(`📋 Tabla ${tableName} preparada con ${columns.length} columnas`)
    
    // Truncar tabla antes de insertar
    const truncateQuery = `TRUNCATE TABLE ${tableName};`
    await sql.query(truncateQuery)
    console.log(`🗑️ Tabla ${tableName} truncada`)
    
    // Insertar datos usando múltiples valores
    let insertedRows = 0
    const batchSize = 1000
    
    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize)
      
      if (batch.length === 0) continue
      
      const valueGroups = []
      const allValues = []
      
      for (let rowIndex = 0; rowIndex < batch.length; rowIndex++) {
        const row = batch[rowIndex]
        const actualRowIndex = i + rowIndex
        const processedRow = processRowData(columns, row, tableName, actualRowIndex)
        
        const paddedRow = Array(columns.length).fill(null)
        for (let j = 0; j < Math.min(processedRow.length, columns.length); j++) {
          paddedRow[j] = processedRow[j]
        }
        
        const startIndex = rowIndex * columns.length
        const placeholders = columns.map((_, colIndex) => `$${startIndex + colIndex + 1}`).join(', ')
        valueGroups.push(`(${placeholders})`)
        
        allValues.push(...paddedRow)
      }
      
      const columnNames = columns.map(col => `"${col}"`).join(', ')
      const insertQuery = `INSERT INTO ${tableName} (${columnNames}) VALUES ${valueGroups.join(', ')}`
      
      await sql.query(insertQuery, allValues)
      insertedRows += batch.length
      
      console.log(`📊 Procesado lote ${Math.floor(i / batchSize) + 1}, total: ${insertedRows} filas`)
    }
    
    console.log(`✅ ${insertedRows} filas cargadas en '${tableName}'`)
    return insertedRows
    
  } catch (error) {
    console.error(`❌ Error en carga a '${tableName}':`, error)
    throw error
  }
}

// Función para convertir columnas a tipo DATE
async function convertirColumnasFecha(sql: any, conversiones: Record<string, string[]>) {
  for (const [tabla, columnas] of Object.entries(conversiones)) {
    console.log(`\n🔄 Procesando tabla: ${tabla}`)
    
    for (const col of columnas) {
      try {
        console.log(` - Convirtiendo columna: ${col} → DATE...`)
        
        const checkColumnQuery = `
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = '${tabla}' AND column_name = '${col}';
        `
        const columnExists = await sql.query(checkColumnQuery)
        
        if (columnExists.length > 0) {
          const checkTypeQuery = `
            SELECT data_type 
            FROM information_schema.columns 
            WHERE table_name = '${tabla}' AND column_name = '${col}';
          `
          const columnTypeResult = await sql.query(checkTypeQuery)
          
          if (columnTypeResult[0]?.data_type === 'date') {
            console.log(`   ✅ ${col} ya es tipo DATE, omitiendo conversión.`)
          } else {
            const alterQuery = `
              ALTER TABLE ${tabla}
              ALTER COLUMN "${col}" TYPE DATE
              USING CASE 
                WHEN "${col}" IS NULL OR "${col}" ~ '^\\s*$' THEN NULL
                ELSE "${col}"::DATE
              END;
            `
            await sql.query(alterQuery)
            console.log(`   ✅ Columna ${col} convertida a tipo DATE.`)
          }
        } else {
          console.log(`   ⚠️ La columna ${col} no existe en la tabla ${tabla}.`)
        }
      } catch (error) {
        console.error(`   ❌ Error al convertir columna ${col} a tipo DATE:`, error)
      }
    }
  }
} 