'use client'

import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useResueltosAnalysis } from '@/hooks/use-resueltos-analysis';
import { format, parseISO, subMonths, isAfter } from 'date-fns';
import { es } from 'date-fns/locale';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, Area, AreaChart } from 'recharts';

interface ResueltosData {
  mes: string;
  estadopre: string;
  operadorpre: string | null;
  total: number;
}

interface ResueltosProps {
  proceso: 'ccm' | 'prr';
}

export default function ResueltosDashboard({ proceso }: ResueltosProps) {
  const { data, isLoading, error } = useResueltosAnalysis(proceso);
  const [selectedView, setSelectedView] = useState<'overview' | 'trends' | 'operators' | 'categories'>('overview');

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse bg-gray-200 h-32 rounded-lg"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="animate-pulse bg-gray-200 h-24 rounded-lg"></div>
          ))}
        </div>
        <div className="animate-pulse bg-gray-200 h-96 rounded-lg"></div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <Card className="p-6">
        <div className="text-center text-red-600">
          <h3 className="text-lg font-semibold mb-2">Error al cargar los datos</h3>
          <p>No se pudieron cargar los datos de resoluciones. Por favor, intenta de nuevo.</p>
        </div>
      </Card>
    );
  }

  // Procesamiento de datos para insights
  const processedData = processResueltosData(data);

  return (
    <div className="space-y-6">
      {/* Header y Navegación */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            📊 Análisis de Resoluciones {proceso.toUpperCase()}
          </h2>
          <p className="text-gray-600 mt-1">
            Análisis detallado de expedientes resueltos en los últimos 24 meses
          </p>
        </div>
        
        <div className="flex gap-2">
          {[
            { key: 'overview', label: '📈 Resumen', icon: '📈' },
            { key: 'trends', label: '📊 Tendencias', icon: '📊' },
            { key: 'operators', label: '👥 Operadores', icon: '👥' },
            { key: 'categories', label: '🏷️ Categorías', icon: '🏷️' }
          ].map(({ key, label }) => (
            <Button
              key={key}
              variant={selectedView === key ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedView(key as any)}
              className="text-xs"
            >
              {label}
            </Button>
          ))}
        </div>
      </div>

      {/* KPIs Principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Total Resueltos"
          value={processedData.totalResueltos.toLocaleString()}
          subtitle="Últimos 24 meses"
          trend={processedData.trendGeneral}
          icon="✅"
        />
        <KPICard
          title="Promedio Mensual"
          value={Math.round(processedData.promedioMensual).toLocaleString()}
          subtitle="Expedientes/mes"
          trend={processedData.trendPromedio}
          icon="📊"
        />
        <KPICard
          title="Operadores Activos"
          value={processedData.operadoresActivos.toString()}
          subtitle="Con resoluciones"
          trend={{ type: 'neutral', value: 0 }}
          icon="👥"
        />
        <KPICard
          title="Categorías Estados"
          value={processedData.categorias.length.toString()}
          subtitle="Tipos diferentes"
          trend={{ type: 'neutral', value: 0 }}
          icon="🏷️"
        />
      </div>

      {/* Contenido Principal según la vista seleccionada */}
      {selectedView === 'overview' && <OverviewSection data={processedData} />}
      {selectedView === 'trends' && <TrendsSection data={processedData} />}
      {selectedView === 'operators' && <OperatorsSection data={processedData} />}
      {selectedView === 'categories' && <CategoriesSection data={processedData} />}
    </div>
  );
}

// Función para procesar los datos y generar insights
function processResueltosData(rawData: ResueltosData[]) {
  const now = new Date();
  const twelveMonthsAgo = subMonths(now, 12);
  const twentyFourMonthsAgo = subMonths(now, 24);

  // Datos agrupados por mes
  const monthlyData = new Map<string, number>();
  const categoryData = new Map<string, number>();
  const operatorData = new Map<string, number>();
  const last12Months = new Map<string, number>();
  const previous12Months = new Map<string, number>();

  rawData.forEach(item => {
    const date = parseISO(item.mes + '-01');
    monthlyData.set(item.mes, (monthlyData.get(item.mes) || 0) + item.total);
    categoryData.set(item.estadopre, (categoryData.get(item.estadopre) || 0) + item.total);
    
    if (item.operadorpre) {
      operatorData.set(item.operadorpre, (operatorData.get(item.operadorpre) || 0) + item.total);
    }

    // Separar últimos 12 meses vs anteriores
    if (isAfter(date, twelveMonthsAgo)) {
      last12Months.set(item.mes, (last12Months.get(item.mes) || 0) + item.total);
    } else if (isAfter(date, twentyFourMonthsAgo)) {
      previous12Months.set(item.mes, (previous12Months.get(item.mes) || 0) + item.total);
    }
  });

  // Calcular métricas
  const totalResueltos = Array.from(monthlyData.values()).reduce((a, b) => a + b, 0);
  const promedioMensual = totalResueltos / monthlyData.size;
  const operadoresActivos = operatorData.size;

  // Tendencias
  const lastMonthsTotal = Array.from(last12Months.values()).reduce((a, b) => a + b, 0);
  const previousMonthsTotal = Array.from(previous12Months.values()).reduce((a, b) => a + b, 0);
  const trendGeneral = calculateTrend(lastMonthsTotal, previousMonthsTotal);

  // Datos para gráficos
  const chartData = Array.from(monthlyData.entries())
    .map(([mes, total]) => ({
      mes,
      total,
      mesFormateado: format(parseISO(mes + '-01'), 'MMM yyyy', { locale: es })
    }))
    .sort((a, b) => a.mes.localeCompare(b.mes));

  const categorias = Array.from(categoryData.entries())
    .map(([categoria, total]) => ({ categoria, total, porcentaje: (total / totalResueltos) * 100 }))
    .sort((a, b) => b.total - a.total);

  const topOperadores = Array.from(operatorData.entries())
    .map(([operador, total]) => ({ operador, total, porcentaje: (total / totalResueltos) * 100 }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  return {
    totalResueltos,
    promedioMensual,
    operadoresActivos,
    trendGeneral,
    trendPromedio: { type: 'neutral' as const, value: 0 },
    chartData,
    categorias,
    topOperadores,
    monthlyData: Array.from(monthlyData.entries()),
    last12Months: Array.from(last12Months.entries()),
    previous12Months: Array.from(previous12Months.entries())
  };
}

function calculateTrend(current: number, previous: number) {
  if (previous === 0) return { type: 'neutral' as const, value: 0 };
  const change = ((current - previous) / previous) * 100;
  return {
    type: change > 0 ? 'positive' as const : change < 0 ? 'negative' as const : 'neutral' as const,
    value: Math.abs(change)
  };
}

// Componente KPI Card
interface KPICardProps {
  title: string;
  value: string;
  subtitle: string;
  trend: { type: 'positive' | 'negative' | 'neutral'; value: number };
  icon: string;
}

function KPICard({ title, value, subtitle, trend, icon }: KPICardProps) {
  const trendColor = trend.type === 'positive' ? 'text-green-600' : trend.type === 'negative' ? 'text-red-600' : 'text-gray-600';
  const trendIcon = trend.type === 'positive' ? '↗️' : trend.type === 'negative' ? '↘️' : '➡️';

  return (
    <Card className="p-4 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">{icon}</span>
            <h3 className="text-sm font-medium text-gray-600">{title}</h3>
          </div>
          <div className="text-2xl font-bold text-gray-900 mb-1">{value}</div>
          <div className="text-xs text-gray-500">{subtitle}</div>
        </div>
        {trend.value > 0 && (
          <div className={`text-right ${trendColor}`}>
            <div className="text-lg">{trendIcon}</div>
            <div className="text-xs font-medium">{trend.value.toFixed(1)}%</div>
          </div>
        )}
      </div>
    </Card>
  );
}

// Sección Resumen
function OverviewSection({ data }: { data: any }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          📈 Evolución Mensual de Resoluciones
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={data.chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="mesFormateado" fontSize={12} />
            <YAxis fontSize={12} />
            <Tooltip />
            <Area 
              type="monotone" 
              dataKey="total" 
              stroke="#3b82f6" 
              fill="#3b82f6" 
              fillOpacity={0.3}
              name="Resoluciones"
            />
          </AreaChart>
        </ResponsiveContainer>
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          🏷️ Distribución por Categorías
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={data.categorias.slice(0, 8)}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ categoria, porcentaje }) => `${categoria} (${porcentaje.toFixed(1)}%)`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="total"
            >
              {data.categorias.slice(0, 8).map((_: any, index: number) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}

// Sección Tendencias
function TrendsSection({ data }: { data: any }) {
  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          📊 Análisis de Tendencias Temporales
        </h3>
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={data.chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="mesFormateado" fontSize={12} />
            <YAxis fontSize={12} />
            <Tooltip />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="total" 
              stroke="#3b82f6" 
              strokeWidth={3}
              dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
              name="Resoluciones por Mes"
            />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6">
          <h4 className="text-md font-semibold mb-3 text-green-700">✅ Últimos 12 Meses</h4>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Total:</span>
              <span className="font-bold">{data.last12Months.reduce((a: any, b: any) => a + b[1], 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>Promedio mensual:</span>
              <span className="font-bold">{Math.round(data.last12Months.reduce((a: any, b: any) => a + b[1], 0) / Math.max(data.last12Months.length, 1)).toLocaleString()}</span>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h4 className="text-md font-semibold mb-3 text-blue-700">📊 Meses Anteriores</h4>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Total:</span>
              <span className="font-bold">{data.previous12Months.reduce((a: any, b: any) => a + b[1], 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>Promedio mensual:</span>
              <span className="font-bold">{Math.round(data.previous12Months.reduce((a: any, b: any) => a + b[1], 0) / Math.max(data.previous12Months.length, 1)).toLocaleString()}</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

// Sección Operadores
function OperatorsSection({ data }: { data: any }) {
  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          👥 Ranking de Operadores por Productividad
        </h3>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={data.topOperadores} layout="horizontal">
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" fontSize={12} />
            <YAxis dataKey="operador" type="category" fontSize={10} width={100} />
            <Tooltip />
            <Bar dataKey="total" fill="#3b82f6" />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6">
          <h4 className="text-md font-semibold mb-4">🏆 Top 5 Operadores</h4>
          <div className="space-y-3">
            {data.topOperadores.slice(0, 5).map((op: any, index: number) => (
              <div key={op.operador} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="text-lg">{index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '🏅'}</span>
                  <span className="font-medium">{op.operador}</span>
                </div>
                <div className="text-right">
                  <div className="font-bold">{op.total.toLocaleString()}</div>
                  <div className="text-xs text-gray-600">{op.porcentaje.toFixed(1)}%</div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <h4 className="text-md font-semibold mb-4">📈 Estadísticas de Productividad</h4>
          <div className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-sm text-blue-700 font-medium">Operador más productivo</div>
              <div className="text-lg font-bold text-blue-900">{data.topOperadores[0]?.operador || 'N/A'}</div>
              <div className="text-sm text-blue-600">{data.topOperadores[0]?.total.toLocaleString() || '0'} resoluciones</div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-sm text-green-700 font-medium">Promedio por operador</div>
              <div className="text-lg font-bold text-green-900">
                {Math.round(data.totalResueltos / data.operadoresActivos).toLocaleString()}
              </div>
              <div className="text-sm text-green-600">resoluciones</div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

// Sección Categorías
function CategoriesSection({ data }: { data: any }) {
  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          🏷️ Análisis Detallado por Categorías de Estado
        </h3>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={data.categorias}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="categoria" fontSize={10} angle={-45} textAnchor="end" height={80} />
            <YAxis fontSize={12} />
            <Tooltip />
            <Bar dataKey="total" fill="#3b82f6" />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {data.categorias.slice(0, 6).map((cat: any, index: number) => (
          <Card key={cat.categoria} className="p-4">
            <div className="flex items-center justify-between mb-2">
              <h5 className="font-medium text-sm truncate" title={cat.categoria}>
                {cat.categoria}
              </h5>
              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                #{index + 1}
              </span>
            </div>
            <div className="text-xl font-bold text-gray-900 mb-1">
              {cat.total.toLocaleString()}
            </div>
            <div className="text-sm text-gray-600">
              {cat.porcentaje.toFixed(1)}% del total
            </div>
            <div className="mt-2 bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(cat.porcentaje, 100)}%` }}
              ></div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658', '#FF7C7C']; 