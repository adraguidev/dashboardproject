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

import { Pool } from '@neondatabase/serverless';
import { Workbook } from 'exceljs';
import { Buffer } from 'node:buffer';

// =================================================================================
//  INTERFACES Y TIPOS
// =================================================================================

// Define la estructura del entorno que el Worker espera.
// Cloudflare inyectará aquí los bindings de R2 y los secretos.
export interface Env {
	R2_BUCKET: R2Bucket;
	DATABASE_URL: string; // Este será inyectado desde los secretos de Wrangler
	SELF: Fetcher; // El tipo para un service binding
	// REDIS_URL: string;    // Opcional: para actualizar el estado del job
}

interface ProcessRequest {
	key: string;
	table: string;
	// Parámetros para la auto-invocación
	chunk?: number;
	headers?: string[];
	jobId?: string;
}

// =================================================================================
//  LÓGICA PRINCIPAL DEL WORKER
// =================================================================================

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		if (request.method !== 'POST') {
			return new Response('Método no permitido. Solo POST.', { status: 405 });
		}
		try {
			const body = (await request.json()) as ProcessRequest;
			const jobId = body.jobId || crypto.randomUUID();
			const chunk = body.chunk || 0;
			
			// La clave: ctx.waitUntil espera la promesa devuelta por processFileChunk.
			ctx.waitUntil(processFileChunk(body, env));

			return new Response(JSON.stringify({ message: `Procesamiento iniciado/continuado para job ${jobId}.`, jobId }), {
				status: 202,
				headers: { 'Content-Type': 'application/json' },
			});
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
			return new Response(`Error al iniciar: ${errorMessage}`, { status: 500 });
		}
	},
};

// =================================================================================
//  FUNCIONES DE PROCESAMIENTO EN BACKGROUND
// =================================================================================

async function processFileChunk(requestBody: ProcessRequest, env: Env): Promise<any> {
	const { key, table, chunk = 0 } = requestBody;
	const jobId = requestBody.jobId!;
	let { headers } = requestBody;
	const BATCH_SIZE = 1000;
	const pool = new Pool({ connectionString: env.DATABASE_URL });

	try {
		const r2Object = await env.R2_BUCKET.get(key);
		if (!r2Object) throw new Error(`Archivo ${key} no encontrado.`);

		// CHUNK 0: El "Despachador"
		if (chunk === 0) {
			console.log(`[${jobId}] Invocación #0 (Despachador)`);
			const fileExtension = key.split('.').pop()?.toLowerCase();
			if (fileExtension === 'csv') {
				headers = await getCsvHeaders(r2Object.body);
			} else {
				headers = (await parseExcel(Buffer.from(await r2Object.arrayBuffer()))).headers;
			}
			if (!headers || !headers.length) throw new Error('No se pudieron extraer headers.');
			
			console.log(`[${jobId}] Headers extraídos. Disparando primer obrero...`);
			await triggerNextChunk(env.SELF, { ...requestBody, chunk: 1, headers, jobId });
		} 
		// CHUNKS 1+: Los "Obreros"
		else {
			console.log(`[${jobId}] Invocación #${chunk} (Obrero)`);
			if (!headers) throw new Error(`La invocación #${chunk} no recibió headers.`);
			
			const startRow = (chunk - 1) * BATCH_SIZE + 1;
			const { rowsProcessed, hasMoreData } = await processCsvChunk(r2Object.body, pool, table, headers, startRow, BATCH_SIZE, jobId);

			if (hasMoreData) {
				const nextChunk = chunk + 1;
				console.log(`[${jobId}] Lote completado. Disparando chunk #${nextChunk}.`);
				await triggerNextChunk(env.SELF, { ...requestBody, chunk: nextChunk, headers, jobId });
			} else {
				console.log(`[${jobId}] ¡ÉXITO! Procesamiento de ${key} completado.`);
				return Promise.resolve(); // Termina la cadena
			}
		}
	} catch (error) {
		console.error(`[${jobId}] Error CRÍTICO en chunk #${chunk}:`, error);
		return Promise.resolve(); // Detiene la cadena en caso de error
	}
}

function triggerNextChunk(fetcher: Fetcher, body: ProcessRequest): Promise<Response> {
	// Al usar un fetcher, no necesitamos construir una URL.
	// Pasamos la petición directamente.
	return fetcher.fetch(new Request("http://localhost/", {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body),
	}));
}

async function getCsvHeaders(stream: ReadableStream): Promise<string[]> {
	const reader = stream.pipeThrough(new TextDecoderStream()).getReader();
	const { value } = await reader.read();
	reader.releaseLock();
	const firstLine = (value || '').split('\n')[0];
	return firstLine.trim().split(';').map(normalizeHeader);
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
	let headers: string[] = [];
	const rows: any[][] = [];
	worksheet.eachRow((row, rowNumber) => {
		const values = (row.values as any[]).slice(1);
		if (rowNumber === 1) {
			headers = values.map(h => normalizeHeader(String(h)));
		} else {
			rows.push(values);
		}
	});
	return { headers, rows };
}

/**
 * Lee un chunk específico de un stream CSV.
 */
async function getCsvChunk(stream: ReadableStream, startRow: number, batchSize: number, existingHeaders?: string[]): Promise<{ rows: string[][], headers: string[], hasMoreData: boolean }> {
	let headers: string[] = existingHeaders || [];
	const rows: string[][] = [];
	let currentRow = 0;
	let firstRow = !existingHeaders;
	let partialLine = '';

	const lineStream = stream.pipeThrough(new TextDecoderStream());

	for await (const chunk of lineStream) {
		const lines = (partialLine + chunk).split('\n');
		partialLine = lines.pop() || '';

		for (const line of lines) {
			const trimmedLine = line.trim();
			if (!trimmedLine) continue;

			if (firstRow) {
				headers = trimmedLine.split(';').map(normalizeHeader);
				firstRow = false;
				continue; // Saltar el header
			}

			// Si ya hemos pasado el chunk que nos interesa
			if (currentRow >= startRow + batchSize) {
				return { rows, headers, hasMoreData: true };
			}

			// Si estamos dentro del rango del chunk
			if (currentRow >= startRow) {
				rows.push(trimmedLine.split(';'));
			}
			currentRow++;
		}
	}
	
	if (partialLine.trim()) {
		if (currentRow >= startRow && currentRow < startRow + batchSize) {
			rows.push(partialLine.trim().split(';'));
		}
	}
	
	return { rows, headers, hasMoreData: false };
}

/**
 * Crea la tabla (si es el primer chunk) e inserta los datos.
 */
async function createTableAndInsertData(pool: Pool, tableName: string, headers: string[], rows: any[][], jobId: string) {
	const client = await pool.connect();
	try {
		await client.query(`DROP TABLE IF EXISTS "${tableName}";`);
		const columnDefinitions = headers.map(h => `"${h}" TEXT`).join(', ');
		await client.query(`CREATE TABLE "${tableName}" (${columnDefinitions});`);
		console.log(`[${jobId}] Tabla ${tableName} creada.`);
		for (let i = 0; i < rows.length; i += 500) {
			const batch = rows.slice(i, i + 500);
			await insertBatch(client, tableName, headers, batch, jobId);
		}
	} finally {
		client.release();
	}
}

/**
 * Normaliza los nombres de los headers para que sean compatibles con SQL.
 */
function normalizeHeader(header: string): string {
	return header.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
}

/**
 * Procesa un lote de un stream CSV.
 */
async function processCsvChunk(stream: ReadableStream, pool: Pool, tableName: string, headers: string[], startRow: number, batchSize: number, jobId: string): Promise<{ rowsProcessed: number; hasMoreData: boolean }> {
	const client = await pool.connect();
	try {
		if (startRow === 1) {
			await client.query(`DROP TABLE IF EXISTS "${tableName}";`);
			const columnDefinitions = headers.map(h => `"${h}" TEXT`).join(', ');
			await client.query(`CREATE TABLE "${tableName}" (${columnDefinitions});`);
			console.log(`[${jobId}] Tabla ${tableName} creada.`);
		}
		let rows: any[][] = [];
		let currentRow = 0;
		let partialLine = '';
		const lineStream = stream.pipeThrough(new TextDecoderStream());
		for await (const chunk of lineStream) {
			const lines = (partialLine + chunk).split('\n');
			partialLine = lines.pop() || '';
			for (const line of lines) {
				if (currentRow < startRow) {
					currentRow++; continue;
				}
				if (rows.length >= batchSize) {
					await insertBatch(client, tableName, headers, rows, jobId);
					return { rowsProcessed: rows.length, hasMoreData: true };
				}
				rows.push(line.trim().split(';'));
				currentRow++;
			}
		}
		if (partialLine.trim()) rows.push(partialLine.trim().split(';'));
		if (rows.length > 0) await insertBatch(client, tableName, headers, rows, jobId);
		return { rowsProcessed: rows.length, hasMoreData: false };
	} finally {
		client.release();
	}
}

async function insertBatch(client: any, tableName: string, headers: string[], batch: any[][], jobId: string) {
	if (batch.length === 0) return;
	const values = batch.map(row => `(${headers.map((_, i) => `'${String(row[i] || '').replace(/'/g, "''")}'`).join(',')})`).join(',');
	const query = `INSERT INTO "${tableName}" (${headers.map(h => `"${h}"`).join(',')}) VALUES ${values}`;
	await client.query(query);
	console.log(`[${jobId}] Lote de ${batch.length} filas insertado.`);
}
