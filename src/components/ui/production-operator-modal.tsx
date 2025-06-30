import React, { useMemo } from 'react'
import { ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { TrendingUp, TrendingDown, Minus, X, Zap } from 'lucide-react'
import { isWorkday } from '@/lib/date-utils'

interface OperatorData {
  operador: string
  fechas: { [fecha: string]: number }
}

type TrendState = 'up' | 'down' | 'flat'

interface ModalProps {
  operator: OperatorData | null
  orderedDates: string[] // array de YYYY-MM-DD en orden
  onClose: () => void
}

function computeTrend(data: { produccion: number }[]): TrendState {
  if (data.length <= 1) return 'flat'
  const values = data.map(d => d.produccion)
  // Eliminar outliers usando percentiles 10-90
  const sorted = [...values].sort((a,b)=>a-b)
  const p10 = sorted[Math.floor(sorted.length*0.1)]
  const p90 = sorted[Math.floor(sorted.length*0.9)]
  const filtered = values.filter(v=>v>=p10 && v<=p90)
  const n = filtered.length
  const avgFirst = filtered.slice(0, Math.floor(n/3)).reduce((a,b)=>a+b,0)/Math.max(1,Math.floor(n/3))
  const avgLast = filtered.slice(-Math.floor(n/3)).reduce((a,b)=>a+b,0)/Math.max(1,Math.floor(n/3))
  const diff = avgLast-avgFirst
  const pct = diff/Math.max(1,avgFirst)
  if (pct>0.15) return 'up'
  if (pct<-0.15) return 'down'
  return 'flat'
}

const TrendAnalysis = ({ trend }: { trend: TrendState }) => {
  let trendInfo = {
    icon: <Minus className="h-6 w-6 text-gray-500" />,
    title: 'Tendencia Estable',
    description: 'La producción se ha mantenido constante.',
    style: 'bg-gray-50 text-gray-800 border-gray-200'
  };

  if (trend === 'up') {
    trendInfo = {
      icon: <TrendingUp className="h-6 w-6 text-green-500" />,
      title: 'Tendencia a la Alza',
      description: 'Se observa un incremento progresivo en la producción.',
      style: 'bg-green-50 text-green-800 border-green-200'
    };
  } else if (trend === 'down') {
    trendInfo = {
      icon: <TrendingDown className="h-6 w-6 text-red-500" />,
      title: 'Tendencia a la Baja',
      description: 'La producción está disminuyendo con el tiempo.',
      style: 'bg-red-50 text-red-800 border-red-200'
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

export function ProductionOperatorModal({ operator, orderedDates, onClose }: ModalProps){
  const chartData = useMemo(()=>{
    if(!operator) return []
    const data = orderedDates.map(d=>({
      fechaOriginal: d,
      fecha: d.slice(5),
      Produccion: operator.fechas[d] || 0,
      isWeekend: !isWorkday(d)
    }))
    .filter(item => {
      // Filtrar días sin producción, y fines de semana con producción baja (<5) para reducir ruido.
      if (item.isWeekend) {
        return item.Produccion >= 5;
      }
      return item.Produccion > 0;
    });

    // Re-usar lógica de tendencia de OperatorTrendModal
    const n = data.length
    if (n > 1) {
      let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
      data.forEach((point, index) => {
        sumX += index
        sumY += point.Produccion
        sumXY += index * point.Produccion
        sumXX += index * index
      });
      const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX)
      const intercept = (sumY - slope * sumX) / n
      data.forEach((point, index) => {
        (point as any)['Tendencia'] = Math.max(0, slope * index + intercept)
      });
    }
    return data
  },[operator, orderedDates])

  if(!operator) return null

  const trend = computeTrend(chartData.map(d => ({ produccion: d.Produccion })))

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex justify-center items-center backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl p-6 m-4 transform transition-all" onClick={e=>e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4 border-b pb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Evolución de Producción</h2>
            <p className="text-indigo-600 font-semibold">{operator.operador}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100"><X className="h-6 w-6 text-gray-600"/></button>
        </div>
        
        <div className="h-80 w-full mb-6">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
              <defs>
                <linearGradient id="colorProduccion" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
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
                formatter={(value, name, props) => [value, name]}
                labelFormatter={(label) => `Fecha: ${label}`}
                itemSorter={(item) => (item.dataKey === 'Produccion' ? -1 : 1)}
                content={({ active, payload, label }) => {
                  if (!active || !payload || !payload.length) return null
                  const data = payload[0].payload
                  return (
                    <div className="bg-white p-3 border rounded-lg shadow-lg text-sm">
                      <p className="font-semibold mb-1">Fecha: {label} ({data.fechaOriginal})</p>
                      {payload.map((p, i) => (
                        <p key={i} style={{ color: p.color }}>{`${p.name}: ${p.value}`}</p>
                      ))}
                      {data.isWeekend && <p className="text-orange-500 text-xs mt-1">Fin de semana</p>}
                    </div>
                  )
                }}
              />
              <Legend />
              <Area 
                type="monotone" 
                dataKey="Produccion" 
                stroke="#4f46e5"
                strokeWidth={2}
                fill="url(#colorProduccion)"
                dot={(props) => {
                  const { cx, cy, payload, key } = props;
                  if (payload.isWeekend) {
                    return <circle key={key} cx={cx} cy={cy} r={5} fill="#f97316" stroke="#fff" strokeWidth={2} />;
                  }
                  return <circle key={key} cx={cx} cy={cy} r={4} fill="#4f46e5" />;
                }}
                activeDot={{ r: 6 }}
              />
              <Line 
                type="monotone"
                dataKey="Tendencia"
                stroke="#f97316"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        
        <TrendAnalysis trend={trend} />
      </div>
    </div>
  )
} 