import { NextRequest, NextResponse } from 'next/server'
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import { neon } from '@neondatabase/serverless'
import * as XLSX from 'xlsx'
import { Readable } from 'stream'
import { getJsDateFromExcel } from 'excel-date-to-js'
import path from 'path'
import csv from 'csv-parser'

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

// Columnas que deben ser DATE - exactamente como en el código de Colab
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

// Función para detectar si un valor es un número serial de Excel (fecha)
function isExcelDateSerial(value: any): boolean {
  // Debe ser un número, positivo, y típicamente entre 1 y 50000+ (fechas razonables)
  return typeof value === 'number' && 
         value > 0 && 
         value < 100000 && // fechas hasta aprox año 2173
         Number.isInteger(value * 86400) // puede tener decimales para horas/minutos
}

// Función para convertir fechas de Excel a formato ISO string
function convertExcelDateToISO(value: any): string | null {
  try {
    if (isExcelDateSerial(value)) {
      const jsDate = getJsDateFromExcel(value)
      return jsDate.toISOString().split('T')[0]
    }
    
    // Si ya es una fecha en string, intentar parsearlo
    if (typeof value === 'string' && value.trim()) {
      // Primero, intentamos el formato DD/MM/YYYY que viene del CSV
      const parts = value.split('/');
      if (parts.length === 3) {
        const [day, month, year] = parts;
        // Creamos la fecha en formato YYYY-MM-DD para asegurar consistencia
        const formattedDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        const parsed = new Date(formattedDate);
        if (!isNaN(parsed.getTime())) {
          return parsed.toISOString().split('T')[0];
        }
      }
      
      // Como fallback, intentamos el constructor de Date directamente
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
    
    // Si es una columna de fecha, el resultado DEBE ser una fecha o NULL.
    if (dateColumns.includes(columnName)) {
      const convertedDate = convertExcelDateToISO(value)
      if (convertedDate) {
        dateConversions++
        if (rowIndex === 0) { // Log solo para la primera fila
          console.log(`🔄 Fecha convertida en ${columnName}: ${value} → ${convertedDate}`)
        }
        return convertedDate;
      } else {
        // Si no se pudo convertir (ej. celda vacía), SIEMPRE retornar NULL para la DB.
        if (rowIndex === 0 && value != null && value !== '') {
          console.log(`⚠️ No se pudo convertir fecha en ${columnName}: ${value} (tipo: ${typeof value}), se usará NULL.`)
        }
        return null;
      }
    }
    
    // Para otras columnas, convertir a string si no es null/undefined
    return value != null ? String(value) : null
  })
  
  if (rowIndex === 0 && dateConversions > 0) {
    console.log(`✅ Convertidas ${dateConversions} fechas de Excel en la primera fila`)
  }
  
  return processedRow
}

// Lógica de lectura unificada: Soporta CSV, XLSX y XLS usando solo SheetJS.
async function readFileAuto(fileBuffer: Buffer, fileName: string): Promise<any[][]> {
  const fileExtension = path.extname(fileName).toLowerCase();
  console.log(`🚀 Iniciando lectura de archivo: ${fileName}.`);

  // Para CSV, usamos un parser de streaming dedicado para máxima eficiencia de memoria.
  if (fileExtension === '.csv') {
    return new Promise((resolve, reject) => {
      console.log("🧠 Usando el parser de streaming 'csv-parser'.");
      const data: any[][] = [];
      const stream = Readable.from(fileBuffer);
      
      stream
        .pipe(csv({ 
          headers: false, // Para que no ignore la primera fila (que es el header)
          separator: ';'  // ¡La clave! Especificamos el delimitador correcto.
        })) 
        .on('data', (row: any) => {
          // csv-parser devuelve un objeto con claves numéricas, lo convertimos a un array de valores.
          data.push(Object.values(row));
        })
        .on('end', () => {
          console.log(`✅ Lectura de CSV con streaming completada. Se encontraron ${data.length} filas.`);
          resolve(data);
        })
        .on('error', (error: Error) => {
          console.error('❌ Error durante el streaming del CSV:', error);
          reject(new Error(`Error al procesar el archivo CSV: ${error.message}`));
        });
    });
  } 
  // Para XLSX/XLS, la carga en buffer es necesaria por la naturaleza del formato (ZIP).
  else if (fileExtension === '.xlsx' || fileExtension === '.xls') {
    console.log(`🧠 Usando el lector de Excel en memoria (SheetJS) para ${fileExtension}.`);
    try {
      const workbook = XLSX.read(fileBuffer, { type: 'buffer', cellFormula: false, cellNF: false, cellStyles: false });
      const sheetName = workbook.SheetNames[0];
      if (!sheetName) throw new Error("El archivo no contiene hojas o no pudo ser leído.");
      
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

      if (!data || data.length === 0) throw new Error("El archivo parece estar vacío.");
      
      console.log(`✅ Lectura de Excel completada. Se encontraron ${data.length} filas.`);
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      throw new Error(`Error al procesar el archivo Excel (${fileName}): ${errorMessage}`);
    }
  } else {
    throw new Error(`Formato de archivo no soportado: ${fileExtension}`);
  }
}

// Función para limpiar nombres de columnas - igual que en Colab
function cleanColumnNames(data: any[][]): { columns: string[], rows: any[][] } {
  if (data.length === 0) throw new Error("Archivo vacío")
  
  const originalColumns = data[0]
  const columns = originalColumns.map((col: any) => 
    String(col).trim().replace(/\s+/g, '_').replace(/-/g, '_').toLowerCase()
  )
  
  const rows = data.slice(1) // Todos los datos excepto el header
  
  return { columns, rows }
}

// Función para subir archivo a R2
async function uploadToR2(fileBuffer: Buffer, fileName: string): Promise<string> {
  const key = `uploads/${Date.now()}-${fileName}`
  
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: fileBuffer,
    ContentType: 'application/octet-stream'
  })
  
  await r2Client.send(command)
  return key
}

// Función para descargar archivo de R2
async function downloadFromR2(key: string): Promise<Buffer> {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key
  })
  
  const response = await r2Client.send(command)
  
  if (!response.Body) {
    throw new Error('No se pudo descargar el archivo de R2')
  }

  // Convertir stream a buffer
  const chunks: Buffer[] = []
  const stream = response.Body as Readable
  
  return new Promise((resolve, reject) => {
    stream.on('data', (chunk: Buffer) => chunks.push(chunk))
    stream.on('end', () => resolve(Buffer.concat(chunks)))
    stream.on('error', reject)
  })
}

// Función para cargar DataFrame a PostgreSQL - adaptada del código de Colab
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
    
    // Truncar tabla antes de insertar - exactamente como en Colab
    const truncateQuery = `TRUNCATE TABLE ${tableName};`
    await sql.query(truncateQuery)
    console.log(`🗑️ Tabla ${tableName} truncada`)
    
    // Insertar datos usando múltiples valores (más eficiente)
    let insertedRows = 0
    // Aumentamos el tamaño del lote para optimizar la velocidad de inserción.
    // Menos lotes = menos viajes de red a la base de datos = más rápido.
    // El límite de parámetros de PostgreSQL es 65535. Con ~30 columnas,
    // un lote de 1000 (30,000 parámetros) es seguro y mucho más eficiente.
    const batchSize = 1000
    
    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize)
      
      if (batch.length === 0) continue
      
      // Preparar múltiples filas para inserción
      const valueGroups = []
      const allValues = []
      
      for (let rowIndex = 0; rowIndex < batch.length; rowIndex++) {
        const row = batch[rowIndex]
        
        // Procesar la fila incluyendo conversión de fechas de Excel
        const actualRowIndex = i + rowIndex // índice global de la fila
        const processedRow = processRowData(columns, row, tableName, actualRowIndex)
        
        // Asegurar que la fila tenga el mismo número de columnas
        const paddedRow = Array(columns.length).fill(null)
        for (let j = 0; j < Math.min(processedRow.length, columns.length); j++) {
          paddedRow[j] = processedRow[j]
        }
        
        // Crear placeholders para esta fila
        const startIndex = rowIndex * columns.length
        const placeholders = columns.map((_, colIndex) => `$${startIndex + colIndex + 1}`).join(', ')
        valueGroups.push(`(${placeholders})`)
        
        // Añadir valores al array
        allValues.push(...paddedRow)
      }
      
      // Usar template literals para la inserción
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

// Función para convertir columnas a tipo DATE - exactamente como en Colab
async function convertirColumnasFecha(sql: any, conversiones: Record<string, string[]>) {
  for (const [tabla, columnas] of Object.entries(conversiones)) {
    console.log(`\n🔄 Procesando tabla: ${tabla}`)
    
    for (const col of columnas) {
      try {
        console.log(` - Convirtiendo columna: ${col} → DATE...`)
        
        // Verificar si la columna existe antes de intentar convertirla
        const checkColumnQuery = `
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = '${tabla}' AND column_name = '${col}';
        `
        const columnExists = await sql.query(checkColumnQuery)
        
        if (columnExists.length > 0) {
          // Primero verificar si ya es tipo DATE
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

export async function POST(request: NextRequest) {
  console.log('🚀 Iniciando procesamiento de archivos...')
  
  try {
    // Verificar variables de entorno
    if (!process.env.CLOUDFLARE_R2_ENDPOINT || !process.env.CLOUDFLARE_R2_ACCESS_KEY_ID || 
        !process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY || !process.env.CLOUDFLARE_R2_BUCKET_NAME) {
      throw new Error('Variables de entorno de Cloudflare R2 no configuradas')
    }

    // Obtener archivos del formulario
    const formData = await request.formData()
    const ccmFile = formData.get('ccm_file') as File | null
    const prrFile = formData.get('prr_file') as File | null

    if (!ccmFile && !prrFile) {
      return NextResponse.json(
        { error: 'Debes proporcionar al menos un archivo (ccm_file o prr_file).' },
        { status: 400 }
      )
    }

    console.log(`📂 Archivos recibidos:`);
    if (ccmFile) console.log(`   - CCM: ${ccmFile.name} (${(ccmFile.size / 1024 / 1024).toFixed(1)} MB)`);
    if (prrFile) console.log(`   - PRR: ${prrFile.name} (${(prrFile.size / 1024 / 1024).toFixed(1)} MB)`);

    // Subir archivos a R2 y construir la configuración dinámicamente
    console.log('☁️ Subiendo archivos a Cloudflare R2...');
    const fileConfigs: { key: string; tableName: string; fileName: string; buffer: Buffer; }[] = [];

    if (ccmFile) {
        const ccmBuffer = Buffer.from(await ccmFile.arrayBuffer());
        const ccmKey = await uploadToR2(ccmBuffer, ccmFile.name);
        fileConfigs.push({ key: ccmKey, tableName: 'table_ccm', fileName: ccmFile.name, buffer: ccmBuffer });
        console.log('✅ Archivo CCM subido a R2.');
    }

    if (prrFile) {
        const prrBuffer = Buffer.from(await prrFile.arrayBuffer());
        const prrKey = await uploadToR2(prrBuffer, prrFile.name);
        fileConfigs.push({ key: prrKey, tableName: 'table_prr', fileName: prrFile.name, buffer: prrBuffer });
        console.log('✅ Archivo PRR subido a R2.');
    }

    // Conectar a la base de datos
    console.log('🔌 Conectando a la base de datos (modo DIRECTO para carga)...')
    const connectionString = process.env.DATABASE_DIRECT_URL
    if (!connectionString) {
      throw new Error("No se encontró DATABASE_DIRECT_URL en variables de entorno. Es requerida para la carga de archivos.")
    }
    
    const sql = neon(connectionString)
    console.log('✅ Conexión a la base de datos (DIRECTA) establecida')

    let totalProcessedRows = 0

    // Procesar cada archivo - exactamente como en el bucle de Colab
    for (const config of fileConfigs) {
      console.log(`\n📂 Procesando archivo: ${config.fileName}`)
      
      try {
        // Leer archivo según extensión
        const rawData = await readFileAuto(config.buffer, config.fileName)
        console.log(`📊 Datos leídos: ${rawData.length} filas`)
        
        // Limpiar nombres de columnas
        const { columns, rows } = cleanColumnNames(rawData)
        console.log(`🧹 Columnas limpiadas: ${columns.length} columnas, ${rows.length} filas de datos`)
        
        // Mostrar ejemplo de datos para debug
        console.log(`📊 Columnas: ${columns.slice(0, 10).join(', ')}${columns.length > 10 ? '...' : ''}`)
        if (rows.length > 0) {
          console.log(`📝 Primera fila de ejemplo:`, rows[0].slice(0, 5))
        }
        
        // Cargar a PostgreSQL
        const processedRows = await copyDataFrameToPostgres(columns, rows, config.tableName, sql)
        totalProcessedRows += processedRows
        
        console.log(`✅ ${config.tableName} procesada exitosamente`)
        
      } catch (error) {
        console.error(`❌ Error procesando ${config.fileName}:`, error)
        throw new Error(`Error procesando ${config.fileName}: ${error instanceof Error ? error.message : 'Error desconocido'}`)
      }
    }

    // Convertir columnas a tipo DATE - exactamente como en Colab
    console.log('\n🔄 Convirtiendo columnas de fecha...')
    await convertirColumnasFecha(sql, conversiones)

    console.log('\n🎉 Procesamiento completado exitosamente')
    console.log(`📊 Total de filas procesadas: ${totalProcessedRows}`)
    
    const tablesUpdated = fileConfigs.map(config => config.tableName);

    return NextResponse.json({
      success: true,
      message: `Archivos procesados exitosamente. ${totalProcessedRows} filas insertadas en: ${tablesUpdated.join(', ')}.`,
      details: {
        totalRows: totalProcessedRows,
        tablesUpdated: tablesUpdated,
        dateColumnsConverted: "multiple"
      }
    })

  } catch (error) {
    console.error('❌ Error general:', error)
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Error interno del servidor',
        details: 'Revisar logs del servidor para más información'
      },
      { status: 500 }
    )
  }
}