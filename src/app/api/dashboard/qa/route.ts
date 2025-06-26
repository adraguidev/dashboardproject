import { NextRequest, NextResponse } from 'next/server'
import { redisGet, redisSet } from '@/lib/redis'
import { getGemini } from '@/lib/gemini'
import { getDrizzleDB } from '@/lib/db'
import { sql } from 'drizzle-orm'

async function getEvaluadores(process: 'ccm' | 'prr') {
  const cacheKey = `evaluadores_general_${process}`;
  const cachedData = await redisGet(cacheKey);
  if (cachedData) return cachedData;

  console.log(`- Cache miss para evaluadores en QA API: ${cacheKey}. Obteniendo desde DB...`);
  const { db } = await getDrizzleDB();
  const tableName = `evaluadores_${process}`;
  const result = await db.execute(
    sql`SELECT * FROM ${sql.identifier(tableName)} ORDER BY nombre_en_base ASC`
  );
  
  const evaluadores = result.rows.map((row: any) => ({
    id: row.id,
    operador: row.nombre_en_base ?? '-',
    nombre_en_base: row.nombre_en_base ?? '-',
    nombres_apellidos: row.nombres_apellidos ?? row.nombre_real ?? row.nombre_en_base ?? '-',
  }));
  
  await redisSet(cacheKey, evaluadores, 3600);
  return evaluadores;
}

async function getContextForProcess(process: 'ccm' | 'prr', evaluadores: any[]) {
  const [ingresos, produccion, pendientes, kpis] = await Promise.all([
    redisGet(`ingresos_${process}_30`),
    redisGet(`produccion_${process}_20_TODOS`),
    redisGet(`pendientes_${process}_year`),
    redisGet(`kpis_${process}`),
  ]);

  if (!ingresos && !produccion && !pendientes && !kpis) {
    return `- No se encontraron datos para el proceso ${process.toUpperCase()}. Pueden estar cargándose en segundo plano.\n`;
  }

  let context = '';
  if (ingresos) context += `  - Ingresos (30d): Total ${ingresos.totalTramites}.\n`;
  if (produccion) context += `  - Producción (20d): Total ${produccion.grandTotal}.\n`;
  
  if (pendientes && pendientes.data && evaluadores.length > 0) {
    const evaluadorNames = evaluadores.map(e => e.operador);
    let principales = 0;
    let porAsignar = 0;

    for (const item of pendientes.data) {
        const operador = item.operador;
        const total = item.total;

        if (evaluadorNames.includes(operador)) {
            principales += total;
        } else {
            porAsignar += total;
        }
    }
    context += `  - Pendientes (anual): Total ${pendientes.grandTotal}.\n    Desglose: ${principales} (Equipo Principal), ${porAsignar} (Pendientes de Asignación).\n`;
  } else if (pendientes) {
    context += `  - Pendientes (anual): Total ${pendientes.grandTotal} (desglose no disponible por falta de lista de evaluadores).\n`;
  }

  if (kpis) context += `  - KPIs: Eficiencia ${kpis.eficiencia}%, Productividad ${kpis.productividad}.\n`;
  return context;
}

export async function POST(request: NextRequest) {
  try {
    const { question, process: currentProcess = 'ccm' } = await request.json();
    if (!question) {
      return NextResponse.json({ error: 'Parámetro "question" requerido' }, { status: 400 });
    }

    const [evaluadoresCCMList, evaluadoresPRRList, procesosInfo] = await Promise.all([
      getEvaluadores('ccm'),
      getEvaluadores('prr'),
      redisGet('processes')
    ]);

    const [contextCCM, contextPRR] = await Promise.all([
      getContextForProcess('ccm', evaluadoresCCMList),
      getContextForProcess('prr', evaluadoresPRRList),
    ]);

    let fullContext = "--- CONTEXTO GLOBAL DEL SISTEMA ---\n\n";
    fullContext += `PROCESO CCM (${procesosInfo?.ccm?.fullName || 'N/A'}):\n${contextCCM}\n`;
    fullContext += `PROCESO PRR (${procesosInfo?.prr?.fullName || 'N/A'}):\n${contextPRR}\n`;

    const allEvaluadores = [...evaluadoresCCMList, ...evaluadoresPRRList];
    const activeEvaluators = allEvaluadores.filter((evaluator, index, self) =>
      index === self.findIndex(e => e.operador === evaluator.operador)
    );
    fullContext += `EQUIPO: Hay ${activeEvaluators.length} evaluadores únicos en total para ambos procesos.\n\n`;

    const finalPrompt = `Eres "Sentinel", un asistente de IA experto en análisis de datos de inmigración para el Dashboard UFSM.
Tu propósito es ser un analista proactivo que identifica tendencias y cuellos de botella.
Basa tus respuestas estrictamente en el contexto. Sé preciso, analítico y ve al grano.

REGLAS DE NEGOCIO Y LÓGICA DEL SISTEMA:
- El usuario está viendo "${currentProcess.toUpperCase()}", pero tienes datos de AMBOS procesos. Úsalos para comparar si es relevante.
- La data de pendientes se desglosa en dos categorías clave:
  1. "Equipo Principal": Carga de trabajo real asignada a evaluadores. Es el indicador principal de rendimiento.
  2. "Pendientes de Asignación": Trámites en cola (Sin Operador, Por Revisar, Otros). Un número alto aquí es un cuello de botella.
- Compara siempre Ingresos vs. Producción. Si Ingresos > Producción, los "Pendientes de Asignación" tenderán a subir.
- Si los datos para un proceso no están disponibles, informa que pueden estar cargándose.

--- CONTEXTO DISPONIBLE ---
${fullContext}
--- PREGUNTA DEL USUARIO ---
Pregunta: ${question}`;

    const gemini = getGemini();
    const model = gemini.getGenerativeModel({ model: "gemini-1.5-flash-latest" });
    const result = await model.generateContent(finalPrompt);
    const response = await result.response;
    const text = response.text();

    return NextResponse.json({ response: text });

  } catch (error) {
    console.error('❌ Error detallado en la API de QA:', JSON.stringify(error, null, 2));
    return NextResponse.json({ error: 'Error al procesar la solicitud con la API de IA.', details: (error as Error).message }, { status: 500 });
  }
}

export const runtime = 'nodejs' 