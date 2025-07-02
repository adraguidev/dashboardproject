'use client'

import { ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { useMemo } from 'react'
import { TrendingUp, TrendingDown, Minus, Zap, X } from 'lucide-react'
import React from 'react'

interface OperatorData {
  operador: string
  [fecha: string]: any
}

interface ModalProps {
  operatorData: OperatorData | null
  fechas: { original: string; formatted: string }[]
  onClose: () => void
}

const TrendAnalysis = ({ data }: { data: { fecha: string; Pendientes: number; Tendencia: number }[] }) => {
  if (data.length <= 1) {
    return (
      <div className="flex items-center gap-3 rounded-lg bg-blue-50 p-4 border border-blue-200">
        <Zap className="h-6 w-6 text-blue-500" />
        <div>
          <h4 className="font-semibold text-blue-800">Primera Fecha Registrada</h4>
          <p className="text-sm text-blue-700">No hay suficientes datos para calcular una tendencia.</p>
        </div>
      </div>
    )
  }

  const startValue = data[0]?.Tendencia
  const endValue = data[data.length - 1]?.Tendencia
  const slope = endValue - startValue

  let trendInfo = {
    icon: <Minus className="h-6 w-6 text-gray-500" />,
    title: 'Tendencia Estable',
    description: 'La carga de pendientes se ha mantenido constante.',
    style: 'bg-gray-50 text-gray-800 border-gray-200'
  };

  if (slope > 1) {
    trendInfo = {
      icon: <TrendingUp className="h-6 w-6 text-red-500" />,
      title: 'Tendencia a la Alza',
      description: 'La carga de pendientes está aumentando con el tiempo.',
      style: 'bg-red-50 text-red-800 border-red-200'
    };
  } else if (slope < -1) {
    trendInfo = {
      icon: <TrendingDown className="h-6 w-6 text-green-500" />,
      title: 'Tendencia a la Baja',
      description: 'Se observa una reducción progresiva de los pendientes.',
      style: 'bg-green-50 text-green-800 border-green-200'
    };
  }

  return (
    <div className={`flex items-center gap-3 rounded-lg p-4 border ${trendInfo.style}`}>
      {trendInfo.icon}
      <div>
        <h4 className="font-semibold">{trendInfo.title}</h4>
        <p className="text-sm">{trendInfo.description}</p>
      </div>
    </div>
  )
}

function OperatorTrendModalComponent({ operatorData, fechas, onClose }: ModalProps) {
  const chartData = useMemo(() => {
    if (!operatorData) return []
    const data = fechas.map(f => ({
      fecha: f.formatted,
      Pendientes: operatorData[f.original] as number || 0
    }));

    // Cálculo de la línea de tendencia
    const n = data.length;
    if (n > 1) {
      let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
      data.forEach((point, index) => {
        sumX += index;
        sumY += point.Pendientes;
        sumXY += index * point.Pendientes;
        sumXX += index * index;
      });
      const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
      const intercept = (sumY - slope * sumX) / n;
      data.forEach((point, index) => {
        (point as any)['Tendencia'] = Math.max(0, slope * index + intercept);
      });
    }
    return data;
  }, [operatorData, fechas])

  if (!operatorData) return null

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex justify-center items-center backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl p-6 m-4 transform transition-all" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4 border-b pb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Evolución de Pendientes</h2>
            <p className="text-orange-600 font-semibold">{operatorData.operador}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100">
            <X className="h-6 w-6 text-gray-600" />
          </button>
        </div>
        
        <div className="h-80 w-full mb-6">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
              <defs>
                <linearGradient id="colorPendientes" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f97316" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" vertical={false} />
              <XAxis dataKey="fecha" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(255, 255, 255, 0.9)',
                  border: '1px solid #e0e0e0',
                  borderRadius: '0.5rem',
                }}
              />
              <Legend />
              <Area 
                type="monotone" 
                dataKey="Pendientes" 
                stroke="#f97316"
                strokeWidth={2}
                fill="url(#colorPendientes)"
                dot={{ r: 4, fill: '#f97316' }}
                activeDot={{ r: 6 }}
              />
              <Line 
                type="monotone"
                dataKey="Tendencia"
                stroke="#4f46e5"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        
        <TrendAnalysis data={chartData as any} />
      </div>
    </div>
  )
}

 
export const OperatorTrendModal = React.memo(OperatorTrendModalComponent) as typeof OperatorTrendModalComponent; 