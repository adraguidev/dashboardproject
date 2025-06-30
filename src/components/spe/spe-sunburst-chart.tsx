'use client'

import React, { useMemo, useState } from 'react'
import * as d3 from 'd3'
import { ArrowLeft } from 'lucide-react'

interface SunburstData {
  name: string;
  children?: SunburstData[];
  value?: number;
}

interface SunburstChartProps {
  data: SunburstData;
  width: number;
  height: number;
}

// Paleta de colores para procesos (se mantiene fija durante la vida del componente)
const PROCESS_COLORS = d3.scaleOrdinal<string, string>(d3.schemeTableau10);

// La paleta para los estados necesita recalcularse cada vez que cambiamos de proceso
// para que los colores de los anillos y la leyenda estén sincronizados.
function useStateColors(childrenNames: string[] | undefined) {
  return useMemo(() => {
    return d3
      .scaleOrdinal<string, string>()
      .domain(childrenNames ?? [])
      .range(d3.schemeSet3);
  }, [childrenNames?.join('|')]);
}

export function SpeSunburstChart({ data, width, height }: SunburstChartProps) {
  const radius = Math.min(width, height) / 2.1;
  
  const [activeNode, setActiveNode] = useState<d3.HierarchyNode<SunburstData> | null>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  
  const root = useMemo(() => {
    return d3.hierarchy(data).sum(d => d.value || 0).sort((a,b) => b.value! - a.value!);
  }, [data]);
  
  const partition = useMemo(() => {
    return d3.partition<SunburstData>().size([2 * Math.PI, radius]);
  }, [radius]);
  
  const displayedRoot = activeNode || root;
  partition(displayedRoot);

  const arc = useMemo(() => {
    return d3.arc<d3.HierarchyRectangularNode<SunburstData>>()
      .startAngle(d => d.x0)
      .endAngle(d => d.x1)
      .padAngle(d => Math.min((d.x1 - d.x0) / 2, 0.005))
      .padRadius(radius / 2)
      .innerRadius(radius * 0.65) // Anillo interior más grande
      .outerRadius(radius);
  }, [radius]);
  
  const handleArcClick = (event: React.MouseEvent, d: d3.HierarchyNode<SunburstData>) => {
    event.stopPropagation();
    if (d.children && d.depth === 1) { 
      setActiveNode(d);
    }
  };

  const handleReset = (event: React.MouseEvent) => {
      event.stopPropagation();
      setActiveNode(null);
  }
  
  const displayedNodes = activeNode ? activeNode.children || [] : root.children || [];
  const totalValue = displayedNodes.reduce((sum, d) => sum + (d.value || 0), 0);
  
  // Escala dinámica para los estados cuando hacemos zoom en un proceso
  const stateColors = useStateColors(activeNode ? activeNode.children?.map(c => c.data.name) : undefined);

  const getColor = (d: d3.HierarchyNode<SunburstData>): string => {
    if (activeNode) {
      // Zoom: coloreamos por estado usando la escala recalculada
      return stateColors(d.data.name);
    }
    // Vista general: coloreamos por proceso
    return PROCESS_COLORS(d.data.name);
  };
  
  // Función para dividir el texto en líneas
  function wrapText(text: string, width: number) {
    const words = text.split(/\s+/).reverse();
    let word;
    const lines = [];
    let line: string[] = [];
    
    while ((word = words.pop())) {
      line.push(word);
      if (line.join(' ').length > width) {
        line.pop();
        lines.push(line.join(' '));
        line = [word];
      }
    }
    lines.push(line.join(' '));
    return lines;
  }

  return (
    <div className="flex flex-col lg:flex-row items-start gap-8 mx-auto w-fit">
      <div className="flex-shrink-0 flex justify-center items-center relative">
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
            <g transform={`translate(${width / 2}, ${height / 2})`}>
            {displayedNodes.map((d, i) => {
              const rectNode = d as d3.HierarchyRectangularNode<SunburstData>;
              const isHovered = hoveredNode === rectNode.data.name;
              return (
                <path
                  key={`${rectNode.data.name}-${i}`}
                  fill={getColor(rectNode)}
                  fillOpacity={hoveredNode ? (isHovered ? 1 : 0.9) : 0.9}
                  stroke="white"
                  strokeWidth={1.5}
                  d={arc(rectNode) || ''}
                  onClick={(e) => handleArcClick(e, rectNode)}
                  style={{ cursor: 'pointer', transition: 'all 0.4s ease-in-out' }}
                  onMouseEnter={() => setHoveredNode(rectNode.data.name)}
                  onMouseLeave={() => setHoveredNode(null)}
                >
                  <title>{`${d.data.name}\nTotal: ${d.value?.toLocaleString()}`}</title>
                </path>
              );
            })}
            </g>
        </svg>
        <div className="absolute flex flex-col items-center justify-center text-center pointer-events-none w-[60%]">
          {activeNode && (
            <>
              <div className="text-sm font-semibold text-gray-800 pointer-events-none leading-tight text-center">
                {wrapText(activeNode.data.name, 25).map((line, i) => (
                  <span key={i} className="block whitespace-nowrap">{line}</span>
                ))}
              </div>
              <button
                onClick={handleReset}
                className="mt-3 text-xs flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-full pointer-events-auto transition-colors"
              >
                <ArrowLeft className="w-3 h-3" />
                Volver a Procesos
              </button>
            </>
          )}
        </div>
      </div>
      <div className="flex-shrink-0 bg-slate-50 p-4 rounded-lg border max-w-xs overflow-auto">
        <h4 className="font-bold text-slate-800 mb-3 text-sm px-1">Leyenda</h4>
        <div className="space-y-1.5 text-xs">
          {displayedNodes.map(d => {
            const percentage = totalValue > 0 ? ((d.value || 0) / totalValue * 100).toFixed(1) : 0;
            const isHovered = hoveredNode === d.data.name;
            return (
              <div 
                key={d.data.name} 
                className={`p-2 rounded-lg flex justify-between items-center transition-all duration-200 ${isHovered ? 'bg-white shadow-md' : 'bg-transparent'}`}
                onMouseEnter={() => setHoveredNode(d.data.name)}
                onMouseLeave={() => setHoveredNode(null)}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: getColor(d) }}></div>
                  <span className="font-medium text-slate-700 leading-tight break-words" title={d.data.name}>{d.data.name}</span>
                </div>
                <div className="font-mono text-slate-600 flex-shrink-0 pl-3 text-right">
                  <span className="font-semibold block">{percentage}%</span>
                  <span className="text-slate-400">({d.value?.toLocaleString()})</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  );
} 