'use client'

import React, { useEffect, useState } from 'react'
import { Database, Wifi, WifiOff, AlertCircle, CheckCircle } from 'lucide-react'

interface DatabaseStatusProps {
  className?: string
}

interface DatabaseInfo {
  status: 'connected' | 'disconnected' | 'error'
  name: string
  responseTime: number
  lastCheck: Date
}

export function DatabaseStatus({ className = '' }: DatabaseStatusProps) {
  const [dbStatus, setDbStatus] = useState<DatabaseInfo>({
    status: 'connected',
    name: 'PostgreSQL',
    responseTime: 0,
    lastCheck: new Date()
  })
  const [loading, setLoading] = useState(true)

  const checkDatabaseStatus = async () => {
    const startTime = Date.now()
    
    try {
      const response = await fetch('/api/dashboard/db-status')
      const endTime = Date.now()
      const responseTime = endTime - startTime

      if (response.ok) {
        const data = await response.json()
        setDbStatus({
          status: 'connected',
          name: data.database || 'PostgreSQL',
          responseTime,
          lastCheck: new Date()
        })
      } else {
        setDbStatus(prev => ({
          ...prev,
          status: 'error',
          responseTime,
          lastCheck: new Date()
        }))
      }
    } catch (error) {
      setDbStatus(prev => ({
        ...prev,
        status: 'disconnected',
        responseTime: 0,
        lastCheck: new Date()
      }))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    checkDatabaseStatus()
    const interval = setInterval(checkDatabaseStatus, 30000) // Check every 30 seconds
    return () => clearInterval(interval)
  }, [])

  const getStatusConfig = () => {
    switch (dbStatus.status) {
      case 'connected':
        return {
          icon: CheckCircle,
          color: 'text-emerald-600',
          bgColor: 'bg-emerald-50',
          borderColor: 'border-emerald-200',
          text: 'Conectado',
          detail: `${dbStatus.responseTime}ms`
        }
      case 'error':
        return {
          icon: AlertCircle,
          color: 'text-amber-600',
          bgColor: 'bg-amber-50',
          borderColor: 'border-amber-200',
          text: 'Con errores',
          detail: `${dbStatus.responseTime}ms`
        }
      case 'disconnected':
      default:
        return {
          icon: WifiOff,
          color: 'text-red-600',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          text: 'Desconectado',
          detail: 'Sin respuesta'
        }
    }
  }

  const statusConfig = getStatusConfig()
  const StatusIcon = statusConfig.icon

  if (loading) {
    return (
      <div className={`flex items-center gap-3 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg ${className}`}>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-gray-300 rounded-full animate-pulse"></div>
          <div className="w-20 h-3 bg-gray-300 rounded animate-pulse"></div>
        </div>
      </div>
    )
  }

  return (
    <div className={`flex items-center justify-between px-4 py-2.5 ${statusConfig.bgColor} border ${statusConfig.borderColor} rounded-lg transition-all ${className}`}>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <StatusIcon className={`w-4 h-4 ${statusConfig.color}`} />
          <span className="text-sm font-medium text-gray-900">Base de Datos</span>
        </div>
        
        <div className="flex items-center gap-2 text-xs text-gray-600">
          <span>{statusConfig.text}</span>
          <span>•</span>
          <span>{statusConfig.detail}</span>
        </div>
      </div>
      
      <div className="text-xs text-gray-500">
        Actualizado: {dbStatus.lastCheck.toLocaleTimeString('es-PE', { 
          hour: '2-digit', 
          minute: '2-digit',
          second: '2-digit'
        })}
      </div>
    </div>
  )
} 
 
 