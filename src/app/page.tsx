import Link from 'next/link'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-6">
      <div className="max-w-4xl mx-auto text-center">
        <div className="bg-white rounded-lg shadow-xl p-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            🚀 UFSM Dashboard
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Dashboard avanzado para análisis de KPIs, métricas y procesos de negocio
          </p>
          
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <div className="p-6 border rounded-lg">
              <div className="text-3xl mb-2">📊</div>
              <h3 className="font-semibold mb-2">KPIs Avanzados</h3>
              <p className="text-sm text-gray-600">
                Visualización de métricas clave con tendencias y comparativas
              </p>
            </div>
            
            <div className="p-6 border rounded-lg">
              <div className="text-3xl mb-2">📈</div>
              <h3 className="font-semibold mb-2">Gráficos Interactivos</h3>
              <p className="text-sm text-gray-600">
                Múltiples tipos de gráficos usando Recharts
              </p>
            </div>
            
            <div className="p-6 border rounded-lg">
              <div className="text-3xl mb-2">🔄</div>
              <h3 className="font-semibold mb-2">Gestión de Procesos</h3>
              <p className="text-sm text-gray-600">
                Organización por procesos de negocio
              </p>
            </div>
          </div>

          <Link 
            href="/dashboard"
            className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
          >
            Acceder al Dashboard →
          </Link>
          
          <div className="mt-8 text-sm text-gray-500">
            <p>Stack: Next.js 15 + React 19 + TypeScript + Tailwind CSS + PostgreSQL</p>
          </div>
        </div>
      </div>
    </div>
  )
}
