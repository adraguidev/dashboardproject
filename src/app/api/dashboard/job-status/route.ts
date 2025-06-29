import { NextRequest, NextResponse } from 'next/server';

/**
 * Este endpoint consulta la API de GitHub para obtener el estado
 * de la ejecución más reciente de un workflow específico.
 */
export async function GET(request: NextRequest) {
	const { searchParams } = new URL(request.url);
	const repo = searchParams.get('repo'); // ej: "adraguidev/dashboardproject"
	const fileKey = searchParams.get('fileKey'); // El archivo que estamos rastreando

	if (!repo || !fileKey) {
		return NextResponse.json({ error: 'Los parámetros "repo" y "fileKey" son requeridos.' }, { status: 400 });
	}

	const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
	if (!GITHUB_TOKEN) {
		return NextResponse.json({ error: 'Configuración del servidor incompleta (GITHUB_TOKEN).' }, { status: 500 });
	}

	try {
		// 1. Obtener la lista de los workflows más recientes para el evento
		const runsUrl = `https://api.github.com/repos/${repo}/actions/runs?event=repository_dispatch`;
		const runsResponse = await fetch(runsUrl, {
			headers: {
				'Accept': 'application/vnd.github.v3+json',
				'Authorization': `token ${GITHUB_TOKEN}`,
			},
		});

		if (!runsResponse.ok) {
			throw new Error(`Error al obtener los runs de GitHub: ${runsResponse.statusText}`);
		}

		const { workflow_runs }: { workflow_runs: any[] } = await runsResponse.json();

		if (!workflow_runs || workflow_runs.length === 0) {
			// Es posible que la API tarde unos segundos en registrar el run.
			// Devolvemos 'queued' para que el frontend siga intentando.
			return NextResponse.json({ status: 'queued', conclusion: null });
		}
		
		// 2. Buscar el 'run' específico que corresponde a nuestro archivo.
		// El nombre del commit es la forma más fiable de asociarlo.
		const relevantRun = workflow_runs.find((run: any) => {
			// Para eventos de repository_dispatch, el payload está en el título del commit.
			// ¡Esto es un truco! Necesitamos una forma más robusta.
			// Por ahora, asumimos que el último run es el nuestro.
			return run.event === 'repository_dispatch';
		});

		if (!relevantRun) {
			return NextResponse.json({ status: 'queued', conclusion: null });
		}

		// 3. Devolver el estado y la conclusión del 'run'
		return NextResponse.json({
			status: relevantRun.status,       // ej: "in_progress", "completed"
			conclusion: relevantRun.conclusion, // ej: "success", "failure"
		});

	} catch (error) {
		console.error('Error al consultar el estado del job en GitHub:', error);
		const errorMessage = error instanceof Error ? error.message : 'Error desconocido.';
		return NextResponse.json({ error: 'Error interno del servidor.', details: errorMessage }, { status: 500 });
	}
} 