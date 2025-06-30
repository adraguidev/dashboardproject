'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useMemo } from 'react';
import { Users } from 'lucide-react';

interface OperatorData {
  operador: string;
  subEquipo: string;
  ultimaFecha: number;
  colorClass?: string;
}

interface ChartProps {
  data: OperatorData[];
}

const getBarColor = (colorClass: string | undefined) => {
  if (!colorClass) return '#d1d5db'; // Gris por defecto
  if (colorClass.includes('orange')) return '#fb923c'; // Naranja
  if (colorClass.includes('green')) return '#4ade80'; // Verde
  return '#60a5fa'; // Azul para 'EVALUACION' o sin color específico
};

export function OperatorComparisonChart({ data }: ChartProps) {
  const chartData = useMemo(() => {
    // Filtrar operadores con 0 pendientes y tomar los top 20 para legibilidad
    return data
      .filter(op => op.ultimaFecha > 0)
      .sort((a, b) => a.ultimaFecha - b.ultimaFecha) // Ordenar de menor a mayor para el gráfico horizontal
      .slice(-20); // Mostrar los 20 con más pendientes
  }, [data]);

  if (chartData.length === 0) {
    return null; // No renderizar el gráfico si no hay datos
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white/80 backdrop-blur-sm p-3 rounded-lg shadow-lg border border-gray-200">
          <p className="font-bold text-gray-800">{label}</p>
          <p className="text-sm text-indigo-600">Pendientes: <span className="font-semibold">{payload[0].value.toLocaleString()}</span></p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="mt-8">
      <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
        <Users className="h-5 w-5 mr-2 text-indigo-600"/>
        Ranking de Pendientes por Operador (Top 20 en la Última Fecha)
      </h3>
      <div className="bg-white p-4 rounded-lg shadow-md border border-gray-200 h-[600px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart 
            data={chartData}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 120, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 12 }} />
            <YAxis 
              type="category" 
              dataKey="operador" 
              width={250}
              tick={{ fontSize: 11, width: 240 }}
              interval={0}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(243, 244, 246, 0.5)' }} />
            <Bar dataKey="ultimaFecha" name="Pendientes" barSize={20}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getBarColor(entry.colorClass)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
} 