import { NextRequest, NextResponse } from 'next/server';
import { createDirectDatabaseAPI } from '@/lib/db';
import { cachedOperation } from '@/lib/server-cache';
import { format } from 'date-fns';

type AggregatedRow = { categoria: string; operador: string; periodo: any; count: number };

function formatAggregatedResueltosData(rows: AggregatedRow[]): any {
  const now = new Date();
  const currentYear = now.getFullYear();
  const previousYear = currentYear - 1;

  const monthNames = Array.from({ length: 12 }, (_, i) => format(new Date(2000, i, 1), 'MMM'));

  const getYearTemplate = () => ({
    total: 0,
    byCategory: new Map<string, number>(),
    byMonth: Array.from({ length: 12 }, (_, i) => ({ month: i + 1, total: 0 })),
    operators: new Map<string, { total: number; byCategory: Map<string, number> }>()
  });

  const yearlyData: Record<number, ReturnType<typeof getYearTemplate>> = {
    [currentYear]: getYearTemplate(),
    [previousYear]: getYearTemplate(),
  };

  const allCategories = new Set<string>();

  rows.forEach(r => {
    const dateStr = typeof r.periodo === 'string' ? r.periodo : (r.periodo as Date).toISOString();
    const date = new Date(dateStr);
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth();

    if (year !== currentYear && year !== previousYear) return;

    const yrData = yearlyData[year];
    const category = r.categoria;
    const operator = r.operador;
    const cnt = r.count;

    yrData.total += cnt;
    yrData.byMonth[month].total += cnt;
    yrData.byCategory.set(category, (yrData.byCategory.get(category) || 0) + cnt);

    allCategories.add(category);

    if (!yrData.operators.has(operator)) {
      yrData.operators.set(operator, { total: 0, byCategory: new Map() });
    }
    const opStats = yrData.operators.get(operator)!;
    opStats.total += cnt;
    opStats.byCategory.set(category, (opStats.byCategory.get(category) || 0) + cnt);
  });

  const formatSummary = (year: number) => {
    const data = yearlyData[year];
    const categories = Array.from(data.byCategory.entries()).map(([name, total]) => ({ name, total })).sort((a,b)=>b.total-a.total);
    return { year, total: data.total, avgMonthly: data.total/12, categories };
  };

  const summary = { currentYear: formatSummary(currentYear), previousYear: formatSummary(previousYear) };

  const monthlyTrends = {
    comparison: monthNames.map((name,i)=>({ month: name, currentYear: yearlyData[currentYear].byMonth[i].total, previousYear: yearlyData[previousYear].byMonth[i].total }))
  };

  const categoryTrends = {
    categories: Array.from(allCategories),
    byMonth: monthNames.map((name,i)=>{
      const obj: any = { month: name };
      allCategories.forEach(cat=>{ obj[cat]=0; });
      rows.forEach(r=>{
        const dateStr = typeof r.periodo==='string'?r.periodo:(r.periodo as Date).toISOString();
        const d=new Date(dateStr);
        if(d.getUTCFullYear()===currentYear && d.getUTCMonth()===i && allCategories.has(r.categoria)){
          obj[r.categoria]=(obj[r.categoria]||0)+r.count;
        }
      });
      return obj;
    })
  };

  const operatorsDetails = {
    categories: Array.from(allCategories),
    operators: Array.from(yearlyData[currentYear].operators.entries()).map(([op,data])=>{
      const byCat: any = {};
      allCategories.forEach(cat=>{ byCat[cat]=data.byCategory.get(cat)||0; });
      return { operator: op, total: data.total, ...byCat };
    }).filter(o=>o.operator!=='SIN OPERADOR').sort((a,b)=>b.total-a.total)
  };

  return { summary, monthlyTrends, categoryTrends, operatorsDetails };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const proceso = (searchParams.get('proceso') as 'ccm' | 'prr') || 'ccm';

    const cacheKey = `dashboard:resueltos_analysis_v3:${proceso}`;
    const ttl = 6 * 60 * 60; // 6 horas

    const analysisData = await cachedOperation({
      key: cacheKey,
      ttlSeconds: ttl,
      fetcher: async () => {
        const dbAPI = await createDirectDatabaseAPI();
        const aggregated = await dbAPI.getAggregatedResueltosAnalysis(proceso);
        const result = formatAggregatedResueltosData(aggregated);
        return result;
      },
    });

    return NextResponse.json({ success: true, data: analysisData });

  } catch (error) {
    console.error("Error en la API de análisis de resueltos:", error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor', details: (error as Error).message },
      { status: 500 }
    );
  }
} 