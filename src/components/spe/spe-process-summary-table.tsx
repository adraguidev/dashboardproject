'use client'

import React, { useState, useMemo } from 'react'
import { useSpeSummary } from '@/hooks/use-spe-summary'
import { BarChart as BarChartIcon, ChevronRight, Loader2, Calendar, PieChart, Download } from 'lucide-react'
import { Button } from '@/components/ui/button';
import { SpeSunburstModal } from './spe-sunburst-modal';
import * as ExcelJS from 'exceljs';

type GroupBy = 'anio' | 'trimestre' | 'mes';

// Definimos tipos más explícitos para la data procesada
type PeriodData = { [period: string]: number };
type EstadoMap = Map<string, PeriodData>;
type ProcesoData = { total: number; estados: EstadoMap };
type ProcessMap = Map<string, ProcesoData>;

const COLORS = ["#8884d8", "#82ca9d", "#ffc658", "#ff8042", "#0088FE", "#00C49F", "#FFBB28", "#FF80E1", "#A4D4FF", "#F4A460", "#DAA520"];

export function SpeProcessSummaryTable({ groupBy }: { groupBy: GroupBy }) {
  const { data: flatData, isLoading, error } = useSpeSummary()
  const [expandedProcesses, setExpandedProcesses] = useState<Set<string>>(new Set())
  const [isChartModalOpen, setIsChartModalOpen] = useState(false);

  const exportToExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Resumen SPE');

    // Headers
    worksheet.columns = [
      { header: 'Proceso / Estado', key: 'proceso', width: 40 },
      ...processedData.periods.map(p => ({ header: p, key: p, width: 15 })),
      { header: 'Total', key: 'total', width: 15 }
    ];
    worksheet.getRow(1).font = { bold: true };

    Array.from(processedData.processes.entries()).forEach(([proceso, procData]) => {
      // Process Row
      const procRowData: any = { proceso: proceso, total: procData.total };
      processedData.periods.forEach(p => {
        procRowData[p] = Array.from(procData.estados.values()).reduce((sum, data) => sum + (data[p] || 0), 0);
      });
      const procRow = worksheet.addRow(procRowData);
      procRow.font = { bold: true };

      // Estado rows
      Array.from(procData.estados.entries()).forEach(([estado, periodData]) => {
        const estadoRowData: any = { 
          proceso: `    ${estado}`, 
          total: Object.values(periodData).reduce((s,t) => s+t, 0)
        };
        processedData.periods.forEach(p => {
          estadoRowData[p] = periodData[p] || 0;
        });
        worksheet.addRow(estadoRowData);
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `resumen_spe_${groupBy}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const processedData = useMemo(() => {
    if (!flatData) return { processes: new Map() as ProcessMap, periods: [] };

    const periods = [...new Set(flatData.map(item => item[groupBy]))].sort();
    
    const processes: ProcessMap = new Map();

    flatData.forEach(item => {
      const { proceso, estado, total } = item;
      const period = item[groupBy];

      if (!processes.has(proceso)) {
        processes.set(proceso, { total: 0, estados: new Map() });
      }
      const procData = processes.get(proceso)!;

      if (!procData.estados.has(estado)) {
        procData.estados.set(estado, {});
      }
      const estadoData = procData.estados.get(estado)!;
      
      estadoData[period] = (estadoData[period] || 0) + total;
    });

    for (const [_, procData] of processes) {
      procData.total = Array.from(procData.estados.values()).reduce((sum, periodData) => 
        sum + Object.values(periodData).reduce((s, t) => s + t, 0), 0);
    }
    
    return { processes, periods };
  }, [flatData, groupBy]);
  
  const sunburstData = useMemo(() => {
      const children = Array.from(processedData.processes.entries())
        .map(([proceso, procData], index) => {
            const totalForPeriod = processedData.periods.reduce((sum, p) =>
                sum + Array.from(procData.estados.values()).reduce((s, e: PeriodData) => s + (e[p] || 0), 0)
            , 0);

            if (totalForPeriod === 0) return null;
            
            return {
                name: proceso,
                children: Array.from(procData.estados.entries()).map(([estado, periodData]) => {
                    const estadoTotal = processedData.periods.reduce((sum, p) => sum + (periodData[p] || 0), 0);
                    return {
                        name: estado,
                        value: estadoTotal,
                    };
                }).filter(e => e.value > 0),
            };
        })
        .filter((item): item is NonNullable<typeof item> => item !== null);

      return { name: 'root', children };
  }, [processedData]);

  const toggleExpand = (proceso: string) => {
    setExpandedProcesses(prev => {
      const newSet = new Set(prev)
      if (newSet.has(proceso)) {
        newSet.delete(proceso)
      } else {
        newSet.add(proceso)
      }
      return newSet
    })
  }
  
  const getEstadoBreakdown = (item: any) => {
    const breakdown: { [estado: string]: { [period: string]: number } } = {};
    
    processedData.periods.forEach(p => {
        const estadosInPeriod = item.periodos[p]?.estados || {};
        Object.entries(estadosInPeriod).forEach(([estado, total]) => {
            if (!breakdown[estado]) {
                breakdown[estado] = processedData.periods.reduce((acc, period) => ({...acc, [period]: 0}), {});
            }
            breakdown[estado][p] = (breakdown[estado][p] || 0) + (total as number);
        });
    });

    const allEstados = Object.keys(breakdown).sort();
    
    return allEstados.map(estado => {
        const totalEstado = Object.values(breakdown[estado]).reduce((sum, count) => sum + count, 0);
        return {
            estado,
            total: totalEstado,
            byPeriod: breakdown[estado]
        }
    })
  }

  if (isLoading) return <div className="text-center p-8"><Loader2 className="mx-auto animate-spin" /></div>
  if (error) return <div className="text-center p-8 text-red-500">Error: {error.message}</div>

  const truncate = (str: string, n: number) => {
    return (str.length > n) ? str.substr(0, n-1) + '…' : str;
  };
  
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white/90 backdrop-blur-sm p-3 rounded-lg shadow-lg border border-gray-200">
          <p className="font-bold text-gray-800 mb-1">{data.name}</p>
          <p className="text-sm text-gray-600">
            <span className="font-semibold">Expedientes:</span> {data.size.toLocaleString()}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="mt-8">
       <div className="flex flex-wrap justify-between items-center gap-4 mb-4">
         <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
           <BarChartIcon className="w-5 h-5 text-purple-600" />
           <span>Resumen por Proceso y Estado</span>
         </h3>
         <div className="flex items-center gap-2">
           <Button 
             onClick={() => setIsChartModalOpen(true)}
             disabled={sunburstData.children.length === 0}
             variant="outline"
             size="sm"
           >
             <PieChart className="w-4 h-4 mr-2" />
             Ver Gráfico
           </Button>
           <Button onClick={exportToExcel} variant="outline" size="sm">
             <Download className="w-4 h-4 mr-2" />
             Exportar
           </Button>
         </div>
       </div>
       
       {/* Tabla primero */}
       <div className="overflow-x-auto bg-white rounded-lg border shadow-md">
         <table className="w-full text-sm">
           <thead className="bg-slate-50 text-slate-600">
             <tr className="border-b border-slate-200">
               <th className="px-4 py-3 text-left w-2/5 font-semibold uppercase text-xs tracking-wider">Proceso</th>
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
             {Array.from(processedData.processes.entries()).map(([proceso, procData]) => (
               <React.Fragment key={proceso}>
                 <tr className="border-t font-medium cursor-pointer hover:bg-slate-50" onClick={() => toggleExpand(proceso)}>
                   <td className="px-4 py-3 flex items-start gap-3">
                      <div className="w-4 h-4 flex-shrink-0 mt-0.5">
                         <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform ${expandedProcesses.has(proceso) ? 'rotate-90' : ''}`} />
                      </div>
                      <span className="font-semibold text-slate-800 whitespace-normal">{proceso}</span>
                   </td>
                   {processedData.periods.map(p => {
                     const totalPeriodo = Array.from(procData.estados.values()).reduce((sum, data) => sum + (data[p] || 0), 0);
                     return <td key={p} className="px-2 py-3 text-center font-mono">{totalPeriodo}</td>
                   })}
                   <td className="px-4 py-3 text-center font-bold">{procData.total}</td>
                 </tr>
                 {expandedProcesses.has(proceso) && (
                   <>
                     {Array.from(procData.estados.entries()).map(([estado, periodData]) => {
                       const totalEstado = Object.values(periodData).reduce((s,t) => s+t, 0);
                       return (
                         <tr key={estado} className="border-t bg-white hover:bg-slate-50">
                             <td className="pl-12 pr-4 py-2 text-slate-600">{estado}</td>
                             {processedData.periods.map(p => (
                               <td key={p} className="px-2 py-2 text-center font-mono text-sm text-slate-500">{periodData[p] || 0}</td>
                             ))}
                             <td className="px-4 py-2 text-center font-semibold">{totalEstado}</td>
                         </tr>
                       )
                     })}
                   </>
                 )}
               </React.Fragment>
             ))}
           </tbody>
         </table>
       </div>

       {/* Modal del Gráfico */}
       <SpeSunburstModal 
         isOpen={isChartModalOpen}
         onClose={() => setIsChartModalOpen(false)}
         data={sunburstData}
       />
     </div>
   )
 } 