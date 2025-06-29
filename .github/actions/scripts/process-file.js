/**
 * Script de Node.js para ser ejecutado por GitHub Actions.
 *
 * Este script se encarga de procesar un archivo desde R2 y cargarlo a PostgreSQL.
 * Recibe toda la información necesaria a través de variables de entorno.
 * Reporta su progreso a Redis para seguimiento en tiempo real.
 */

const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
const postgres = require('postgres');
const { Workbook } = require('exceljs');
const { Readable } = require('stream');
const csv = require('csv-parser');
const { Redis } = require('@upstash/redis');

// Helpers para normalizar headers (igual que en el worker)
function normalizeHeader(header) {
	return header.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
}

// Parser de Excel
async function parseExcel(buffer) {
	const workbook = new Workbook();
	await workbook.xlsx.load(buffer);
	const worksheet = workbook.worksheets[0];
	let headers = [];
	const rows = [];
	worksheet.eachRow((row, rowNumber) => {
		const values = (row.values || []).slice(1);
		if (rowNumber === 1) {
			headers = values.map(h => normalizeHeader(String(h)));
		} else {
			rows.push(values);
		}
	});
	return { headers, rows };
}

// Parser de CSV
async function parseCsv(buffer) {
	return new Promise((resolve, reject) => {
		const rows = [];
		let headers = [];
		const stream = Readable.from(buffer).pipe(csv({ separator: ';', mapHeaders: ({ header }) => normalizeHeader(header) }));
		stream.on('headers', (hdr) => headers = hdr);
		stream.on('data', (data) => rows.push(Object.values(data)));
		stream.on('end', () => resolve({ headers, rows }));
		stream.on('error', reject);
	});
}

// Función principal de ejecución
async function main() {
	const {
		R2_ENDPOINT,
		R2_ACCESS_KEY_ID,
		R2_SECRET_ACCESS_KEY,
		R2_BUCKET_NAME,
		DATABASE_URL,
		UPSTASH_REDIS_REST_URL,
		UPSTASH_REDIS_REST_TOKEN,
		FILE_KEY,
		TABLE_NAME,
		JOB_ID, // Pasado desde el workflow
	} = process.env;

	if (!FILE_KEY || !TABLE_NAME || !JOB_ID) {
		throw new Error('Variables de entorno FILE_KEY, TABLE_NAME, y JOB_ID son requeridas.');
	}

	// Conectar a Redis
	const redis = new Redis({
		url: UPSTASH_REDIS_REST_URL,
		token: UPSTASH_REDIS_REST_TOKEN,
	});

	const updateJobStatus = async (status, progress, message) => {
		const jobData = { status, progress, message, updatedAt: Date.now() };
		await redis.set(`job:${JOB_ID}`, JSON.stringify(jobData), { ex: 3600 });
	};

	let sql;
	try {
		await updateJobStatus('processing', 5, 'Iniciando proceso en GitHub Actions...');
		
		// 1. Obtener configuración de las variables de entorno
		console.log(`Iniciando procesamiento para el archivo: ${FILE_KEY}`);
		console.log(`Tabla destino: ${TABLE_NAME}`);

		// 2. Conectar a R2
		const r2Client = new S3Client({
			region: 'auto',
			endpoint: R2_ENDPOINT,
			credentials: {
				accessKeyId: R2_ACCESS_KEY_ID,
				secretAccessKey: R2_SECRET_ACCESS_KEY,
			},
		});

		// 3. Descargar el archivo
		console.log(`Descargando archivo desde R2...`);
		const command = new GetObjectCommand({ Bucket: R2_BUCKET_NAME, Key: FILE_KEY });
		const response = await r2Client.send(command);
		const fileUint8Array = await response.Body.transformToByteArray();
		
		// Convertir el Uint8Array a un Buffer de Node.js
		const fileBuffer = Buffer.from(fileUint8Array);

		console.log(`Archivo descargado (${(fileBuffer.length / 1024 / 1024).toFixed(2)} MB).`);

		// 4. Parsear el archivo
		const fileExtension = FILE_KEY.split('.').pop()?.toLowerCase();
		let headers, rows;

		if (fileExtension === 'csv') {
			({ headers, rows } = await parseCsv(fileBuffer));
		} else if (['xlsx', 'xls'].includes(fileExtension)) {
			({ headers, rows } = await parseExcel(fileBuffer));
		} else {
			throw new Error(`Formato de archivo no soportado: ${fileExtension}`);
		}

		if (!headers || !rows || headers.length === 0 || rows.length === 0) {
			console.log('El archivo está vacío o no tiene headers. Proceso finalizado.');
			return;
		}
		console.log(`Archivo parseado. ${rows.length} filas y ${headers.length} columnas.`);

		// Conectar a la base de datos
		sql = postgres(DATABASE_URL, { max: 1 });

		// 6. Borrar y recrear tabla
		console.log(`Borrando y recreando la tabla: ${TABLE_NAME}...`);
		await sql.unsafe(`DROP TABLE IF EXISTS ${TABLE_NAME}`);
		const columnDefs = headers.map(h => `"${h}" TEXT`).join(', ');
		await sql.unsafe(`CREATE TABLE ${TABLE_NAME} (${columnDefs})`);
		console.log('Tabla creada exitosamente.');

		// Insertar en lotes y reportar progreso
		const BATCH_SIZE = 10000;
		console.log(`Iniciando inserción en lotes de ${BATCH_SIZE}...`);

		for (let i = 0; i < rows.length; i += BATCH_SIZE) {
			const batch = rows.slice(i, i + BATCH_SIZE);
			const objects = batch.map(row => {
				let obj = {};
				headers.forEach((header, i) => {
					obj[header] = row[i] || null;
				});
				return obj;
			});

			await sql.unsafe(
				`INSERT INTO ${TABLE_NAME} (${headers.map(h => `"${h}"`).join(', ')})
				 VALUES ${objects.map(obj => `(${headers.map(h => `'${String(obj[h] || '').replace(/'/g, "''")}'`).join(',')})`).join(',')}`
			);

			const progress = Math.round(((i + batch.length) / rows.length) * 100);
			await updateJobStatus('processing', progress, `Procesando... ${i + batch.length} de ${rows.length} filas.`);
			console.log(`Lote insertado. Progreso: ${progress}%`);
		}

		await updateJobStatus('completed', 100, '¡Éxito! Todos los datos han sido cargados.');
		console.log('¡ÉXITO! Todas las filas han sido insertadas.');
	} catch (error) {
		const errorMessage = error.message || 'Error desconocido';
		await updateJobStatus('error', 0, `Error crítico: ${errorMessage}`);
		console.error('Error CRÍTICO en el script:', error);
		process.exit(1);
	} finally {
		if (sql) {
			await sql.end();
			console.log('Conexión a la base de datos cerrada.');
		}
	}
}

main().catch(error => {
	console.error('Error no controlado en main:', error);
	process.exit(1);
}); 