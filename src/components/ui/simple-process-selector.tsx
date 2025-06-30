'use client'

import React from 'react'
import { ProcessKey } from '@/types/dashboard'

interface SimpleProcessSelectorProps {
  selectedProcess: ProcessKey
  onProcessChange: (process: ProcessKey) => void
  loading?: boolean
}

export function SimpleProcessSelector({ 
  selectedProcess, 
  onProcessChange, 
  loading = false 
}: SimpleProcessSelectorProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium text-gray-700">Proceso:</span>
      <div className="flex bg-gray-100 rounded-lg p-1">
        <button
          onClick={() => onProcessChange('ccm')}
          disabled={loading}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            selectedProcess === 'ccm'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          CCM
        </button>
        <button
          onClick={() => onProcessChange('prr')}
          disabled={loading}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            selectedProcess === 'prr'
              ? 'bg-green-600 text-white shadow-sm'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          PRR
        </button>
        <button
          onClick={() => onProcessChange('spe')}
          disabled={loading}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            selectedProcess === 'spe'
              ? 'bg-purple-600 text-white shadow-sm'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          SPE
        </button>
        <button
          onClick={() => onProcessChange('pas')}
          disabled={loading}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            selectedProcess === 'pas'
              ? 'bg-yellow-600 text-white shadow-sm'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          PAS
        </button>
      </div>
    </div>
  )
} 
 
 