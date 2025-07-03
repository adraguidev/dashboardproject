'use client'

import React, { useState, useMemo } from 'react'
import { useSolSummary } from '@/hooks/use-sol-summary'
import { BarChart as BarChartIcon, ChevronRight, Loader2, Calendar, Download } from 'lucide-react'
import { Button } from '@/components/ui/button';
import * as ExcelJS from 'exceljs';

type GroupBy = 'anio' | 'trimestre' | 'mes';

// Definimos tipos más explícitos para la data procesada
type PeriodData = { [period: string]: number };
type EstadoData = { total: number; byPeriod: PeriodData };
type EstadoMap = Map<string, EstadoData>;

export function SolEstadoSummaryTable({ groupBy }: { groupBy: GroupBy }) {
  const { data: flatData, isLoading, error } = useSolSummary()
  const [expandedEstados, setExpandedEstados] = useState<Set<string>>(new Set())

  const exportToExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Resumen SOL por Estado');

    // Headers
    worksheet.columns = [
      { header: 'Estado', key: 'estado', width: 40 },
      ...processedData.periods.map(p => ({ header: p, key: p, width: 15 })),
      { header: 'Total', key: 'total', width: 15 }
    ];
    worksheet.getRow(1).font = { bold: true };

    Array.from(processedData.estados.entries()).forEach(([estado, estadoData]) => {
      // Estado Row
      const estadoRowData: any = { estado: estado, total: estadoData.total };
      processedData.periods.forEach(p => {
        estadoRowData[p] = estadoData.byPeriod[p] || 0;
      });
      worksheet.addRow(estadoRowData);
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `resumen_sol_estados_${groupBy}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const processedData = useMemo(() => {
    if (!flatData) return { estados: new Map() as EstadoMap, periods: [] };

    const periods = [...new Set(flatData.map(item => item[groupBy]))].sort();
    
    const estados: EstadoMap = new Map();

    flatData.forEach(item => {
      const { estado, total } = item;
      const period = item[groupBy];

      if (!estados.has(estado)) {
        estados.set(estado, { total: 0, byPeriod: {} });
      }
      const estadoData = estados.get(estado)!;
      
      estadoData.byPeriod[period] = (estadoData.byPeriod[period] || 0) + total;
      estadoData.total += total;
    });
    
    return { estados, periods };
  }, [flatData, groupBy]);

  const toggleExpand = (estado: string) => {
    setExpandedEstados(prev => {
      const newSet = new Set(prev)
      if (newSet.has(estado)) {
        newSet.delete(estado)
      } else {
        newSet.add(estado)
      }
      return newSet
    })
  }

  if (isLoading) return <div className="text-center p-8"><Loader2 className="mx-auto animate-spin" /></div>
  if (error) return <div className="text-center p-8 text-red-500">Error: {error.message}</div>

  return (
    <div className="mt-8">
       <div className="flex flex-wrap justify-between items-center gap-4 mb-4">
         <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
           <BarChartIcon className="w-5 h-5 text-blue-600" />
           <span>Resumen por Estado</span>
         </h3>
         <div className="flex items-center gap-2">
           <Button onClick={exportToExcel} variant="outline" size="sm">
             <Download className="w-4 h-4 mr-2" />
             Exportar
           </Button>
         </div>
       </div>
       
       {/* Tabla */}
       <div className="overflow-x-auto bg-white rounded-lg border shadow-md">
         <table className="w-full text-sm">
           <thead className="bg-slate-50 text-slate-600">
             <tr className="border-b border-slate-200">
               <th className="px-4 py-3 text-left w-2/5 font-semibold uppercase text-xs tracking-wider">Estado</th>
               {processedData.periods.map(p => 
                 <th key={p} className="px-2 py-3 text-center font-semibold uppercase text-xs tracking-wider">
                   <div className="flex items-center justify-center gap-1.5">
                     <Calendar className="w-3.5 h-3.5 text-slate-400" />
                     <span>{p}</span>
                   </div>
                 </th>
               )}
               <th className="px-4 py-3 text-center font-semibold uppercase text-xs tracking-wider bg-slate-100 border-l">Total</th>
             </tr>
           </thead>
           <tbody>
             {Array.from(processedData.estados.entries())
               .sort(([,a], [,b]) => b.total - a.total) // Ordenar por total descendente
               .map(([estado, estadoData]) => (
               <tr key={estado} className="border-t font-medium hover:bg-slate-50">
                 <td className="px-4 py-3 flex items-start gap-3">
                    <span className="font-semibold text-slate-800 whitespace-normal">{estado}</span>
                 </td>
                 {processedData.periods.map(p => {
                   const totalPeriodo = estadoData.byPeriod[p] || 0;
                   return <td key={p} className="px-2 py-3 text-center font-mono">{totalPeriodo}</td>
                 })}
                 <td className="px-4 py-3 text-center font-bold">{estadoData.total}</td>
               </tr>
             ))}
           </tbody>
           {/* Total general */}
           <tfoot className="bg-slate-100">
             <tr className="border-t-2 border-slate-200">
               <th className="px-4 py-3 text-left text-sm font-bold text-slate-800">
                 TOTAL GENERAL
               </th>
               {processedData.periods.map(p => {
                 const totalPeriodo = Array.from(processedData.estados.values())
                   .reduce((sum, estadoData) => sum + (estadoData.byPeriod[p] || 0), 0);
                 return (
                   <th key={p} className="px-2 py-3 text-center text-sm font-bold font-mono text-slate-800">
                     {totalPeriodo}
                   </th>
                 )
               })}
               <th className="px-4 py-3 text-center text-sm font-bold text-slate-800 bg-slate-200 border-l">
                 {Array.from(processedData.estados.values()).reduce((sum, estadoData) => sum + estadoData.total, 0)}
               </th>
             </tr>
           </tfoot>
         </table>
       </div>
     </div>
   )
 } 