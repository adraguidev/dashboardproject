'use client'

import React, { useState } from 'react'

interface TestResult {
  test: string
  status: number | string
  success: boolean
  data?: any
  error?: string
}

interface AuthTestResults {
  success: boolean
  message: string
  timestamp: string
  tokens_tested: string[]
  results: TestResult[]
}

export default function TestAuthPage() {
  const [results, setResults] = useState<AuthTestResults | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const runTests = async () => {
    setLoading(true)
    setError(null)
    setResults(null)

    try {
      const response = await fetch('/api/test-auth')
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Error en las pruebas')
      }
      
      setResults(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  const testEvaluadores = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/dashboard/evaluadores?process=ccm')
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Error obteniendo evaluadores')
      }
      
      alert(`✅ Evaluadores CCM obtenidos: ${data.total} registros`)
    } catch (err) {
      alert(`❌ Error: ${err instanceof Error ? err.message : 'Error desconocido'}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          🧪 Pruebas de Autenticación PostgREST
        </h1>
        
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Controles de Prueba</h2>
          
          <div className="flex gap-4 mb-6">
            <button
              onClick={runTests}
              disabled={loading}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Ejecutando...' : '🔍 Ejecutar Pruebas de Conexión'}
            </button>
            
            <button
              onClick={testEvaluadores}
              disabled={loading}
              className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {loading ? 'Probando...' : '👥 Probar Endpoint Evaluadores'}
            </button>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600">❌ {error}</p>
            </div>
          )}
        </div>

        {results && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Resultados de las Pruebas</h2>
            
            <div className="mb-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-700">
                <strong>Tokens probados:</strong> {results.tokens_tested?.join(', ')} | 
                <strong> Timestamp:</strong> {new Date(results.timestamp).toLocaleString()}
              </p>
            </div>

            <div className="space-y-4">
              {results.results?.map((result, index) => (
                <div 
                  key={index}
                  className={`p-4 rounded-lg border ${
                    result.success 
                      ? 'bg-green-50 border-green-200' 
                      : 'bg-red-50 border-red-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium">
                      {result.success ? '✅' : '❌'} {result.test}
                    </h3>
                    <span className={`px-2 py-1 rounded text-sm ${
                      result.success 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {result.status}
                    </span>
                  </div>
                  
                  <div className="text-sm">
                    {result.success ? (
                      <div>
                        <p className="text-green-700 mb-2">Respuesta exitosa:</p>
                        <pre className="bg-gray-100 p-2 rounded text-xs overflow-x-auto">
                          {JSON.stringify(result.data, null, 2)}
                        </pre>
                      </div>
                    ) : (
                      <div>
                        <p className="text-red-700 mb-2">Error:</p>
                        <pre className="bg-gray-100 p-2 rounded text-xs overflow-x-auto">
                          {result.error || JSON.stringify(result.data, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 