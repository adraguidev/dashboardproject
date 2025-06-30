'use client'

import { useMemo } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { SparklineChart } from '@/components/ui/sparkline-chart';

interface OperatorData {
  operador: string;
  [fecha: string]: any;
}

interface ChartProps {
  data: OperatorData[];
  fechas: { original: string; formatted: string }[];
}

interface Mover {
  operador: string;
  slope: number;
  start: number;
  end: number;
  data: number[];
}

function calculateLinearRegression(points: number[]): number {
  const n = points.length;
  if (n < 2) return 0;

  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
  points.forEach((y, i) => {
    sumX += i;
    sumY += y;
    sumXY += i * y;
    sumXX += i * i;
  });

  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  return isNaN(slope) ? 0 : slope;
}

export function OperatorMovers({ data, fechas }: ChartProps) {
  const movers = useMemo(() => {
    // Tomar solo los últimos 15 días de datos para el análisis de momentum
    const fechasAnalisis = fechas.slice(-15);

    if (fechasAnalisis.length < 5) return { top: [], bottom: [] };

    const activityThreshold = Math.floor(fechasAnalisis.length * 0.5);

    const trends: Mover[] = data
      .map(op => {
        const timeSeries = fechasAnalisis.map(f => op[f.original] as number || 0);
        const activeDays = timeSeries.filter(v => v > 0).length;

        if (activeDays < activityThreshold) {
          return null;
        }

        return {
          operador: op.operador,
          slope: calculateLinearRegression(timeSeries),
          start: timeSeries[0],
          end: timeSeries[timeSeries.length - 1],
          data: timeSeries,
        };
      })
      .filter((m): m is Mover => m !== null);

    const sortedTrends = trends.sort((a, b) => a.slope - b.slope);

    const bottomMovers = sortedTrends.slice(0, 5);
    const topMovers = sortedTrends.slice(-5).reverse();

    return { top: topMovers, bottom: bottomMovers };
  }, [data, fechas]);

  if (movers.top.length === 0 && movers.bottom.length === 0) {
    return null;
  }

  const MoverCard = ({ mover, type }: { mover: Mover, type: 'top' | 'bottom' }) => {
    const isTop = type === 'top';
    const Icon = isTop ? TrendingUp : TrendingDown;
    const color = isTop ? 'text-red-600' : 'text-green-600';
    const bgColor = isTop ? 'bg-red-50' : 'bg-green-50';

    return (
      <div className={`p-4 rounded-lg flex justify-between items-center transition-all hover:shadow-md ${bgColor}`}>
        <div>
          <p className="font-semibold text-gray-800 text-sm">{mover.operador}</p>
          <div className={`flex items-center gap-1 font-bold text-lg ${color}`}>
            <Icon className="h-5 w-5"/>
            <span>{mover.slope.toFixed(2)}</span>
            <span className="text-xs font-normal text-gray-500 ml-1">tasa de cambio</span>
          </div>
        </div>
        <div className="w-24 h-12">
          <SparklineChart data={mover.data} strokeColor={isTop ? '#dc2626' : '#16a34a'} />
        </div>
      </div>
    );
  };

  return (
    <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
          <TrendingDown className="h-5 w-5 mr-2 text-green-600"/>
          Momentum Positivo (Mejor Tendencia - Últimos 15 Días)
        </h3>
        <div className="space-y-3">
          {movers.bottom.map(mover => <MoverCard key={mover.operador} mover={mover} type="bottom" />)}
        </div>
      </div>
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
          <TrendingUp className="h-5 w-5 mr-2 text-red-600"/>
          Momentum Negativo (Peor Tendencia - Últimos 15 Días)
        </h3>
        <div className="space-y-3">
          {movers.top.map(mover => <MoverCard key={mover.operador} mover={mover} type="top" />)}
        </div>
      </div>
    </div>
  );
} 