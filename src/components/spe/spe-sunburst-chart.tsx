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

// Colores fijos para los procesos (anillo principal)
const PROCESS_COLORS = d3.scaleOrdinal(d3.schemeTableau10);

// Escala de colores que se recalcula para los estados cuando el usuario hace zoom
function useStateColors(names: string[] | undefined) {
  return useMemo(() => {
    return d3.scaleOrdinal()
      .domain(names ?? [])
      .range(d3.schemeSet3);
  }, [names?.join('|')]);
}

export function SpeSunburstChart({ data, width, height }: SunburstChartProps) {
  const radius = Math.min(width, height) / 2.1;
  
  // Usamos `any` para evitar depender de los tipos de @types/d3 en producción
  const [activeNode, setActiveNode] = useState<any>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  
  const root: any = useMemo(() => {
    // @ts-ignore – d3.hierarchy carece de tipos en producción
    return d3.hierarchy(data).sum((d: any) => d.value || 0).sort((a: any, b: any) => b.value - a.value);
  }, [data]);
  
  const partition = useMemo(() => {
    // @ts-ignore – sin tipos
    return d3.partition().size([2 * Math.PI, radius] as [number, number]);
  }, [radius]);
  
  const displayedRoot: any = activeNode || root;
  partition(displayedRoot);

  const arc = useMemo(() => {
    // @ts-ignore – sin tipos
    return d3.arc()
      .startAngle((d: any) => d.x0)
      .endAngle((d: any) => d.x1)
      .padAngle((d: any) => Math.min((d.x1 - d.x0) / 2, 0.005))
      .padRadius(radius / 2)
      .innerRadius(radius * 0.65)
      .outerRadius(radius);
  }, [radius]);
  
  const handleArcClick = (e: React.MouseEvent, d: any) => {
    e.stopPropagation();
    if (d.children && d.depth === 1) { 
      setActiveNode(d);
    }
  };

  const handleReset = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveNode(null);
  };
  
  const displayedNodes: any[] = activeNode ? activeNode.children || [] : root.children || [];
  const totalValue = displayedNodes.reduce((sum, d) => sum + (d.value || 0), 0);
  
  const stateColors = useStateColors(activeNode ? activeNode.children?.map((c: any) => c.data.name) : undefined);

  const getColor = (d: any) => {
    if (activeNode) {
      // Zoom: coloreamos por estado usando la escala recalculada
      return stateColors(d.data.name);
    }
    // Vista general: coloreamos por proceso
    return PROCESS_COLORS(d.data.name);
  };
  
  // Divide texto en líneas para el título central
  const wrapText = (text: string, maxLen: number) => {
    const words = text.split(/\s+/).reverse();
    const lines: string[] = [];
    let line: string[] = [];
    let word: string | undefined;

    while ((word = words.pop())) {
      line.push(word);
      if (line.join(' ').length > maxLen) {
        line.pop();
        lines.push(line.join(' '));
        line = [word];
      }
    }
    lines.push(line.join(' '));
    return lines;
  };

  return (
    <div className="flex flex-col lg:flex-row items-start gap-8 mx-auto w-fit">
      <div className="flex-shrink-0 flex justify-center items-center relative">
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
          <g transform={`translate(${width / 2}, ${height / 2})`}>
            {displayedNodes.map((d, i) => {
              const isHovered = hoveredNode === d.data.name;
              return (
                <path
                  key={`${d.data.name}-${i}`}
                  d={arc(d) || ''}
                  fill={getColor(d)}
                  fillOpacity={hoveredNode ? (isHovered ? 1 : 0.3) : 0.9}
                  stroke="white"
                  strokeWidth={1.5}
                  style={{ cursor: 'pointer', transition: 'all 0.4s ease-in-out' }}
                  onClick={(e) => handleArcClick(e, d)}
                  onMouseEnter={() => setHoveredNode(d.data.name)}
                  onMouseLeave={() => setHoveredNode(null)}>
                  <title>{`${d.data.name}\nTotal: ${d.value?.toLocaleString()}`}</title>
                </path>
              );
            })}
          </g>
        </svg>

        {activeNode && (
          <div className="absolute flex flex-col items-center justify-center text-center pointer-events-none w-[60%]">
            <div className="text-sm font-semibold text-gray-800 leading-tight">
              {wrapText(activeNode.data.name, 25).map((line, i) => (
                <span key={i} className="block whitespace-nowrap">
                  {line}
                </span>
              ))}
            </div>
            <button
              onClick={handleReset}
              className="mt-3 text-xs flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-full pointer-events-auto transition-colors">
              <ArrowLeft className="w-3 h-3" /> Volver a Procesos
            </button>
          </div>
        )}
      </div>

      <div className="flex-shrink-0 bg-slate-50 p-4 rounded-lg border max-w-xs overflow-auto">
        <h4 className="font-bold text-slate-800 mb-3 text-sm px-1">Leyenda</h4>
        <div className="space-y-1.5 text-xs">
          {displayedNodes.map((d) => {
            const percentage = totalValue > 0 ? (((d.value || 0) / totalValue) * 100).toFixed(1) : 0;
            const isHovered = hoveredNode === d.data.name;
            return (
              <div
                key={d.data.name}
                className={`p-2 rounded-lg flex justify-between items-center transition-all duration-200 ${isHovered ? 'bg-white shadow-md' : 'bg-transparent'}`}
                onMouseEnter={() => setHoveredNode(d.data.name)}
                onMouseLeave={() => setHoveredNode(null)}>
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: getColor(d) }} />
                  <span className="font-medium text-slate-700 leading-tight break-words" title={d.data.name}>
                    {d.data.name}
                  </span>
                </div>
                <div className="font-mono text-slate-600 flex-shrink-0 pl-3 text-right">
                  <span className="font-semibold block">{percentage}%</span>
                  <span className="text-slate-400">({d.value?.toLocaleString()})</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
