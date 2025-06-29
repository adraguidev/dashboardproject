/**
 * ¡Bienvenido al Worker Procesador de Archivos!
 *
 * Este Worker se encarga de la tarea pesada de procesar archivos CSV/Excel
 * subidos a Cloudflare R2, liberando a tu aplicación principal en Heroku.
 *
 * Flujo de Trabajo:
 * 1. Recibe una petición POST con { key: "nombre-del-archivo.csv", jobId: "..." }.
 * 2. Descarga el archivo desde el bucket R2 vinculado.
 * 3. Se conecta a la base de datos PostgreSQL (Neon).
 * 4. Procesa el archivo en lotes (chunks) para no exceder la memoria.
 * 5. Crea la tabla dinámicamente si no existe, basándose en los headers del archivo.
 * 6. Inserta los datos en la base de datos.
 * 7. (Opcional) Actualiza el estado del job en Redis o similar.
 */

import { neon } from '@neondatabase/serverless';
import { Workbook } from 'exceljs';

// =================================================================================
//  INTERFACES Y TIPOS
// =================================================================================

// Define la estructura del entorno que el Worker espera.
// Cloudflare inyectará aquí los bindings de R2 y los secretos.
export interface Env {
	R2_BUCKET: R2Bucket;
	DATABASE_URL: string; // Este será inyectado desde los secretos de Wrangler
	// REDIS_URL: string;    // Opcional: para actualizar el estado del job
}

interface ProcessRequest {
	key: string;
	jobId: string;
	table: string;
}

// =================================================================================
//  LÓGICA PRINCIPAL DEL WORKER
// =================================================================================

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		// Solo permitir peticiones POST
		if (request.method !== 'POST') {
			return new Response('Método no permitido. Solo POST.', { status: 405 });
		}

		try {
			const { key, jobId, table } = (await request.json()) as ProcessRequest;

			if (!key || !jobId || !table) {
				return new Response('Faltan parámetros: "key", "jobId", "table" son requeridos.', { status: 400 });
			}

			console.log(`[${jobId}] Worker iniciado para procesar: ${key}`);

			// ctx.waitUntil() asegura que el procesamiento continúe incluso después
			// de que la respuesta inicial haya sido enviada. Ideal para tareas largas.
			ctx.waitUntil(processFileInBackground(key, jobId, table, env));

			// Responder inmediatamente a la app de Heroku para no causar timeouts.
			return new Response(JSON.stringify({ message: `Procesamiento de ${key} iniciado en background.`, jobId }), {
				status: 202,
				headers: { 'Content-Type': 'application/json' },
			});
		} catch (error) {
			console.error('Error en la petición principal del Worker:', error);
			const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
			return new Response(`Error al iniciar: ${errorMessage}`, { status: 500 });
		}
	},
};

// =================================================================================
//  FUNCIONES DE PROCESAMIENTO EN BACKGROUND
// =================================================================================

async function processFileInBackground(key: string, jobId: string, table: string, env: Env) {
	console.log(`[${jobId}] Descargando ${key} desde R2...`);
	const r2Object = await env.R2_BUCKET.get(key);
	if (!r2Object) {
		console.error(`[${jobId}] Error: Archivo ${key} no encontrado en R2.`);
		return;
	}
	const fileBuffer = await r2Object.arrayBuffer();
	console.log(`[${jobId}] Archivo ${key} descargado (${(fileBuffer.byteLength / 1024 / 1024).toFixed(2)} MB).`);

	const sql = neon(env.DATABASE_URL);

	try {
		console.log(`[${jobId}] Conectado a DB vía @neondatabase/serverless.`);
		const fileExtension = key.split('.').pop()?.toLowerCase();
		let headers: string[];
		let rows: any[][];

		if (fileExtension === 'csv') {
			({ headers, rows } = await parseCsv(Buffer.from(fileBuffer)));
		} else if (['xlsx', 'xls'].includes(fileExtension || '')) {
			({ headers, rows } = await parseExcel(Buffer.from(fileBuffer)));
		} else {
			throw new Error(`Formato de archivo no soportado: ${fileExtension}`);
		}
		console.log(`[${jobId}] Archivo parseado. Columnas: ${headers.join(', ')}`);
		await createTableAndInsertData(sql, table, headers, rows, jobId);
		console.log(`[${jobId}] ¡Éxito! Procesamiento de ${key} completado.`);
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
		console.error(`[${jobId}] Error CRÍTICO en background:`, errorMessage);
	}
}

// =================================================================================
//  HELPERS DE PARSEO Y BASE DE DATOS
// =================================================================================

/**
 * Parsea un buffer de un archivo Excel.
 */
async function parseExcel(buffer: Buffer): Promise<{ headers: string[]; rows: any[][] }> {
	const workbook = new Workbook();
	await workbook.xlsx.load(buffer);
	const worksheet = workbook.worksheets[0];
	const rows: any[][] = [];
	let headers: string[] = [];

	worksheet.eachRow((row, rowNumber) => {
		const rowValues = (row.values as any[]).slice(1);
		if (rowNumber === 1) {
			headers = rowValues.map(header => normalizeHeader(String(header)));
		} else {
			rows.push(rowValues);
		}
	});

	return { headers, rows };
}

/**
 * Parsea un buffer de un archivo CSV.
 */
async function parseCsv(buffer: Buffer): Promise<{ headers: string[]; rows: any[][] }> {
	const content = buffer.toString('utf-8');
	const lines = content.split('\n').filter(line => line.trim() !== '');

	if (lines.length === 0) {
		return { headers: [], rows: [] };
	}

	const headers = lines[0].split(';').map(h => normalizeHeader(h.trim()));
	const rows = lines.slice(1).map(line => {
		// Simple split, no maneja comillas dentro de campos, pero debería funcionar para tu caso.
		return line.split(';').map(field => field.trim());
	});

	return { headers, rows };
}

/**
 * Crea la tabla en la base de datos si no existe.
 */
async function createTableAndInsertData(sql: any, tableName: string, headers: string[], rows: any[][], jobId: string) {
	const columnDefinitions = headers.map(header => `"${header}" TEXT`).join(', ');
	await sql(`CREATE TABLE IF NOT EXISTS "${tableName}" (${columnDefinitions});`);
	await sql(`TRUNCATE TABLE "${tableName}";`);
	console.log(`[${jobId}] Tabla ${tableName} creada/truncada.`);

	const batchSize = 100;
	for (let i = 0; i < rows.length; i += batchSize) {
		const batch = rows.slice(i, i + batchSize);
		if (batch.length === 0) continue;

		const valuesList = batch.map(row => `(${row.map(val => val === null || val === undefined ? 'NULL' : `'${String(val).replace(/'/g, "''")}'`).join(', ')})`);
		const query = `INSERT INTO "${tableName}" (${headers.map(h => `"${h}"`).join(', ')}) VALUES ${valuesList.join(', ')}`;

		try {
			await sql(query);
			console.log(`[${jobId}] Lote insertado. Filas ${i + 1}-${i + batch.length} de ${rows.length}.`);
		} catch (e: any) {
			console.error(`[${jobId}] Error insertando lote. Query: ${query.substring(0, 500)}...`);
			throw e;
		}
	}
}

/**
 * Normaliza los nombres de los headers para que sean compatibles con SQL.
 */
function normalizeHeader(header: string): string {
	return header.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
}
