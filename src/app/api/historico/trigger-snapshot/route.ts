import { NextResponse } from 'next/server'
import { createDirectDatabaseAPI } from '@/lib/db'
import { sql } from 'drizzle-orm'
import { format } from 'date-fns'
import { toZonedTime } from 'date-fns-tz'
import { NextRequest } from 'next/server'
import { Evaluador } from '@/types/dashboard'

export const dynamic = 'force-dynamic'

async function takeSnapshot(api: import('@/lib/db').DirectDatabaseAPI) {
  const limaTimeZone = 'America/Lima';
  const nowInLima = toZonedTime(new Date(), limaTimeZone);
  const fecha = format(nowInLima, 'yyyy-MM-dd');
  const trimestre = Math.floor(nowInLima.getMonth() / 3) + 1;

  console.log(`Iniciando snapshot para fecha: ${fecha}, trimestre: ${trimestre}`);

  const processes: Array<{ name: 'CCM' | 'PRR' }> = [{ name: 'CCM' }, { name: 'PRR' }];

  const results = {
    operador: { CCM: 0, PRR: 0 },
    sinAsignar: { CCM: 0, PRR: 0 },
  };

  for (const process of processes) {
    // 1. BORRAR los registros existentes del día para este proceso
    console.log(`🗑️ Eliminando snapshots existentes para ${process.name} en fecha ${fecha}...`);
    await api.deleteHistoricoDelDiaOperador(fecha, process.name);
    await api.deleteHistoricoDelDiaSinAsignar(fecha, process.name);

    let allPendientes: any[] = [];

    if (process.name === 'CCM') {
      allPendientes = await api.getAllCCMPendientes();
    } else {
      allPendientes = await api.getAllPRRPendientes();
    }

    const pendientesPorOperador = allPendientes
      .filter(p => p.operador && p.operador.trim() !== '')
      .reduce((acc, p) => {
        acc[p.operador] = (acc[p.operador] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

    const historicosOperador = Object.entries(pendientesPorOperador).map(([operador, pendientes]) => ({
      fecha,
      trimestre,
      proceso: process.name,
      operador,
      anioExpediente: 0,
      pendientes: pendientes as number,
    }));
    
    if (historicosOperador.length > 0) {
      await api.upsertHistoricoPendientesOperador(historicosOperador);
      results.operador[process.name] = historicosOperador.length;
    }

    const totalSinAsignar = allPendientes.filter(p => !p.operador || p.operador.trim() === '').length;
    
    if (totalSinAsignar > 0) {
      const historicosSinAsignar = [{
        fecha,
        trimestre,
        proceso: process.name,
        anioExpediente: 0,
        sinAsignar: totalSinAsignar,
      }];
      
      await api.upsertHistoricoSinAsignar(historicosSinAsignar);
      results.sinAsignar[process.name] = historicosSinAsignar.length;
    }
  }
  return results;
}

// ESTE ES EL NUEVO ENDPOINT SEGURO PARA SER LLAMADO DESDE EL CLIENTE
export async function POST(request: NextRequest) {
  try {
    // AQUÍ IRÍA LA LÓGICA DE AUTENTICACIÓN DEL USUARIO (p. ej. con NextAuth.js, Clerk, etc.)
    // const session = await getAuthSession();
    // if (!session?.user?.isAdmin) {
    //   return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 403 });
    // }

    console.log('🔑 Snapshot manual invocado por un usuario.');

    const api = await createDirectDatabaseAPI({ type: 'direct' });
    const results = await takeSnapshot(api);
    
    return NextResponse.json({ success: true, results });

  } catch (error) {
    console.error('Error tomando el snapshot manual:', error);
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
} 