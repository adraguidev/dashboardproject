import React, { useMemo } from 'react'
import { ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { TrendingUp, TrendingDown, Minus, X } from 'lucide-react'
import { format, parseISO } from 'date-fns'

interface ProduccionItem {
  evaluador: string;
  expedientesPorFecha: { [fecha: string]: any };
  expedientesPorMes: { [mes: string]: any };
  expedientesPorAnio: { [anio: string]: any };
  totalGeneral: number;
}

interface SpeEvaluadorProduccionModalProps {
  evaluador: ProduccionItem | null
  fechasVisibles: string[]
  onClose: () => void
}

type TrendState = 'up' | 'down' | 'flat'

// Helper para asegurar estructura de celda (igual que en la tabla)
function getCell(val: any): { total: number, finalizadas: number, iniciadas: number } {
  if (!val) return { total: 0, finalizadas: 0, iniciadas: 0 };
  if (typeof val === 'number') return { total: val, finalizadas: 0, iniciadas: 0 };
  if (typeof val === 'object' && 'total' in val && 'finalizadas' in val && 'iniciadas' in val) return val;
  return { total: 0, finalizadas: 0, iniciadas: 0 };
}

function computeTrend(data: { total: number }[]): TrendState {
  if (data.length <= 1) return 'flat'
  const values = data.map(d => d.total)
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

export function SpeEvaluadorProduccionModal({ evaluador, fechasVisibles, onClose }: SpeEvaluadorProduccionModalProps) {
  const chartData = useMemo(() => {
    if (!evaluador) return []
    // Detectar si las fechasVisibles son meses (formato YYYY-MM)
    const isMonth = fechasVisibles.length > 0 && /^\d{4}-\d{2}$/.test(fechasVisibles[0]);
    const data = fechasVisibles.map(periodo => {
      const cell = isMonth
        ? getCell(evaluador.expedientesPorMes[periodo])
        : getCell(evaluador.expedientesPorFecha[periodo]);
      return {
        fechaOriginal: periodo,
        fecha: isMonth ? periodo.split('-').reverse().join('/') : format(parseISO(periodo), 'dd/MM'),
        Total: cell.total,
        Finalizadas: cell.finalizadas,
        Iniciadas: cell.iniciadas
      }
    }).filter((item, index, array) => {
      // Si es por mes, excluir el último mes
      if (isMonth && index === array.length - 1) return false;
      return item.Total > 0;
    })
    // Calcular línea de tendencia para el total
    const n = data.length
    if (n > 1) {
      let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
      data.forEach((point, index) => {
        sumX += index
        sumY += point.Total
        sumXY += index * point.Total
        sumXX += index * index
      });
      const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX)
      const intercept = (sumY - slope * sumX) / n
      data.forEach((point, index) => {
        (point as any)['Tendencia'] = Math.max(0, slope * index + intercept)
      });
    }
    return data
  }, [evaluador, fechasVisibles])

  if (!evaluador) return null

  const trend = computeTrend(chartData.map(d => ({ total: d.Total })))

  // Calcular estadísticas
  const totalExpedientes = chartData.reduce((sum, d) => sum + d.Total, 0)
  const totalFinalizadas = chartData.reduce((sum, d) => sum + d.Finalizadas, 0)
  const totalIniciadas = chartData.reduce((sum, d) => sum + d.Iniciadas, 0)
  const promedioDiario = chartData.length > 0 ? (totalExpedientes / chartData.length).toFixed(1) : '0'

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex justify-center items-center backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl p-6 m-4 transform transition-all max-h-[90vh] overflow-y-auto" onClick={e=>e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4 border-b pb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Evolución de Producción SPE</h2>
            <p className="text-green-600 font-semibold">{evaluador.evaluador}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100">
            <X className="h-6 w-6 text-gray-600"/>
          </button>
        </div>

        {/* Estadísticas rápidas */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-50 p-3 rounded-lg text-center">
            <div className="text-2xl font-bold text-blue-600">{totalExpedientes}</div>
            <div className="text-xs text-blue-700">Total Expedientes</div>
          </div>
          <div className="bg-green-50 p-3 rounded-lg text-center">
            <div className="text-2xl font-bold text-green-600">{totalFinalizadas}</div>
            <div className="text-xs text-green-700">Finalizadas</div>
          </div>
          <div className="bg-yellow-50 p-3 rounded-lg text-center">
            <div className="text-2xl font-bold text-yellow-600">{totalIniciadas}</div>
            <div className="text-xs text-yellow-700">Iniciadas</div>
          </div>
          <div className="bg-purple-50 p-3 rounded-lg text-center">
            <div className="text-2xl font-bold text-purple-600">{promedioDiario}</div>
            <div className="text-xs text-purple-700">Promedio/Día</div>
          </div>
        </div>
        
        <div className="h-80 w-full mb-6">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
              <defs>
                <linearGradient id="colorFinalizadas" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0.3}/>
                </linearGradient>
                <linearGradient id="colorIniciadas" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#eab308" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#eab308" stopOpacity={0.3}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" vertical={false} />
              <XAxis dataKey="fecha" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  border: '1px solid #e0e0e0',
                  borderRadius: '0.5rem',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
                content={({ active, payload, label }) => {
                  if (!active || !payload || !payload.length) return null
                  const data = payload[0].payload
                  return (
                    <div className="bg-white p-4 border rounded-lg shadow-lg text-sm">
                      <p className="font-semibold mb-2 text-gray-900">
                        Fecha: {label} ({data.fechaOriginal})
                      </p>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                          <span className="text-gray-600">Total:</span>
                          <span className="font-bold text-blue-600">{data.Total}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                          <span className="text-gray-600">Finalizadas:</span>
                          <span className="font-bold text-green-600">{data.Finalizadas}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                          <span className="text-gray-600">Iniciadas:</span>
                          <span className="font-bold text-yellow-600">{data.Iniciadas}</span>
                        </div>
                      </div>
                    </div>
                  )
                }}
              />
              <Legend />
              
              {/* Áreas apiladas para mostrar composición */}
              <Area 
                type="monotone" 
                dataKey="Iniciadas" 
                stackId="1"
                stroke="#eab308"
                strokeWidth={2}
                fill="url(#colorIniciadas)"
                dot={{ r: 4, fill: '#eab308' }}
                activeDot={{ r: 6 }}
                label={({ x, y, value }: { x?: number; y?: number; value?: number }) => (
                  value && x !== undefined && y !== undefined && value > 0 ? (
                    <text
                      x={x}
                      y={y - 8}
                      textAnchor="middle"
                      fontSize="12"
                      fill="#eab308"
                      fontWeight="bold"
                      style={{ textShadow: '0 1px 2px #fff' }}
                    >
                      {value}
                    </text>
                  ) : null
                )}
              />
              <Area 
                type="monotone" 
                dataKey="Finalizadas" 
                stackId="1"
                stroke="#22c55e"
                strokeWidth={2}
                fill="url(#colorFinalizadas)"
                dot={{ r: 4, fill: '#22c55e' }}
                activeDot={{ r: 6 }}
              />
              
              {/* Línea del total para referencia */}
              <Line 
                type="monotone"
                dataKey="Total"
                stroke="#3b82f6"
                strokeWidth={3}
                dot={{ r: 5, fill: '#3b82f6' }}
                activeDot={{ r: 7 }}
              />
              
              {/* Línea de tendencia */}
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