'use client'

import { useEffect, useState } from 'react'
import { useUser } from "@stackframe/stack"
import Link from "next/link"

interface PostgrestTest {
  success: boolean;
  status: number;
  error?: string;
}

interface TestResult {
  secret: string;
  role: string;
  jwtGeneration: 'success' | 'failure';
  postgrestTest?: PostgrestTest;
}

interface WorkingCombination {
  secret: string;
  role: string;
  fullSecret: string;
}

interface Summary {
  totalTests: number;
  successfulTests: number;
  failedTests: number;
  workingCombinations: WorkingCombination[];
}

interface DebugApiResponse {
  results: {
    summary: Summary;
    jwtTests: TestResult[];
  };
  error?: string;
}

export default function DebugJWTPage() {
  const user = useUser()
  const [results, setResults] = useState<DebugApiResponse['results'] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const runDiagnostic = async () => {
    setLoading(true)
    setError(null)
    setResults(null)

    try {
      const response = await fetch('/api/debug-jwt')
      const data: DebugApiResponse = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error en diagnóstico')
      }

      setResults(data.results)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user) {
      runDiagnostic()
    }
  }, [user])

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Diagnóstico JWT</h1>
          <p className="text-gray-600 mb-6">
            Debes iniciar sesión para ejecutar el diagnóstico JWT.
          </p>
          <Link 
            href="/handler/sign-in" 
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Iniciar Sesión
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">🔬 Diagnóstico JWT</h1>
          <p className="text-gray-600 mb-4">
            Prueba exhaustiva de combinaciones secret/rol para encontrar la configuración correcta de PostgREST
          </p>
          
          <div className="flex items-center space-x-4 mb-6">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-sm text-gray-600">Usuario: {user.displayName || user.primaryEmail}</span>
            </div>
            <button
              onClick={runDiagnostic}
              disabled={loading}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Ejecutando...' : 'Ejecutar Diagnóstico'}
            </button>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <div className="text-red-800 font-medium">Error</div>
              <div className="text-red-600 text-sm mt-1">{error}</div>
            </div>
          )}
        </div>

        {results && (
          <>
            {/* Resumen */}
            <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">📊 Resumen</h2>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{results.summary?.totalTests || 0}</div>
                  <div className="text-sm text-blue-800">Total Pruebas</div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{results.summary?.successfulTests || 0}</div>
                  <div className="text-sm text-green-800">Exitosas</div>
                </div>
                <div className="bg-red-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">{results.summary?.failedTests || 0}</div>
                  <div className="text-sm text-red-800">Fallidas</div>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">
                    {(results.summary?.successfulTests || 0) > 0 ? '✅' : '❌'}
                  </div>
                  <div className="text-sm text-purple-800">Estado</div>
                </div>
              </div>
            </div>

            {/* Combinaciones exitosas */}
            {results.summary?.workingCombinations?.length > 0 && (
              <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
                <h2 className="text-xl font-bold text-green-800 mb-4">🎯 Combinaciones Exitosas</h2>
                <div className="space-y-3">
                  {results.summary.workingCombinations.map((combo: WorkingCombination, index: number) => (
                    <div key={index} className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="font-medium text-green-800">
                            Secret: <code className="bg-green-100 px-2 py-1 rounded text-sm">{combo.secret}</code>
                          </div>
                          <div className="text-green-600 text-sm mt-1">
                            Rol: <code className="bg-green-100 px-2 py-1 rounded">{combo.role}</code>
                          </div>
                        </div>
                        <div className="text-green-600 text-2xl">✅</div>
                      </div>
                      <div className="mt-2 text-xs text-green-600 font-mono break-all">
                        Secret completo: {combo.fullSecret}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tabla detallada de resultados */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">🧪 Resultados Detallados</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full table-auto">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Secret</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rol</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">JWT</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">PostgREST</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Error</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {results.jwtTests?.map((test: TestResult, index: number) => (
                      <tr key={index} className={test.postgrestTest?.success ? 'bg-green-50' : 'bg-red-50'}>
                        <td className="px-4 py-4 text-sm">
                          <code className="bg-gray-100 px-2 py-1 rounded text-xs">{test.secret}</code>
                        </td>
                        <td className="px-4 py-4 text-sm">
                          <code className="bg-gray-100 px-2 py-1 rounded text-xs">{test.role}</code>
                        </td>
                        <td className="px-4 py-4 text-sm">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            test.jwtGeneration === 'success' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {test.jwtGeneration === 'success' ? '✅ OK' : '❌ Error'}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-sm">
                          {test.postgrestTest && (
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              test.postgrestTest.success 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {test.postgrestTest.status} {test.postgrestTest.success ? '✅' : '❌'}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-4 text-sm text-red-600">
                          {test.postgrestTest?.error && (
                            <div className="max-w-xs truncate" title={test.postgrestTest.error}>
                              {test.postgrestTest.error}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
} 