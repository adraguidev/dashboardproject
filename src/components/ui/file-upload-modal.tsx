'use client'

import React, { useState } from 'react'
import { Card } from './card'
import { Button } from './button'

interface FileUploadModalProps {
  isOpen: boolean
  onClose: () => void
  onUploadComplete?: () => void
}

interface UploadProgress {
  fileName: string
  progress: number
  status: 'pending' | 'uploading' | 'uploaded' | 'processing' | 'completed' | 'error'
  message?: string
}

export function FileUploadModal({ isOpen, onClose, onUploadComplete }: FileUploadModalProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [jobId, setJobId] = useState<string | null>(null)
  const [overallStatus, setOverallStatus] = useState<string>('')

  if (!isOpen) return null

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    setSelectedFiles(files)
    setUploadProgress(files.map(file => ({
      fileName: file.name,
      progress: 0,
      status: 'pending'
    })))
  }

  const uploadFileToR2 = async (file: File, uploadUrl: string, onProgress: (progress: number) => void): Promise<void> => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const progress = (event.loaded / event.total) * 100
          onProgress(progress)
        }
      })
      
      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve()
        } else {
          reject(new Error(`HTTP ${xhr.status}: ${xhr.statusText}`))
        }
      })
      
      xhr.addEventListener('error', () => {
        reject(new Error('Error de red durante la subida'))
      })
      
      xhr.open('PUT', uploadUrl)
      xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream')
      xhr.send(file)
    })
  }

  const checkProcessingStatus = async (jobId: string): Promise<void> => {
    const maxAttempts = 120 // 10 minutos máximo (5s * 120 = 600s)
    let attempts = 0
    
    const checkStatus = async (): Promise<void> => {
      try {
        const response = await fetch(`/api/dashboard/upload-status?jobId=${jobId}`)
        const result = await response.json()
        
        if (result.status === 'completed') {
          setOverallStatus('✅ Procesamiento completado exitosamente')
          setUploadProgress(prev => prev.map(p => ({ ...p, status: 'completed' as const })))
          setTimeout(() => {
            onUploadComplete?.()
            onClose()
          }, 2000)
          return
        }
        
        if (result.status === 'error') {
          setOverallStatus(`❌ Error: ${result.error || 'Error desconocido'}`)
          setUploadProgress(prev => prev.map(p => ({ ...p, status: 'error' as const })))
          return
        }
        
        if (result.status === 'in_progress') {
          const progressPercent = result.progress || 0
          setOverallStatus(`🔄 ${result.message || 'Procesando...'} (${Math.round(progressPercent)}%)`)
        }
        
        attempts++
        if (attempts < maxAttempts) {
          setTimeout(checkStatus, 5000) // Verificar cada 5 segundos
        } else {
          setOverallStatus('⏱️ Timeout: El procesamiento está tardando más de lo esperado')
        }
        
      } catch (error) {
        console.error('Error verificando estado:', error)
        setOverallStatus('❌ Error verificando el estado del procesamiento')
      }
    }
    
    // Empezar a verificar después de 2 segundos
    setTimeout(checkStatus, 2000)
  }

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return

    setIsUploading(true)
    setOverallStatus('🚀 Iniciando proceso de subida...')

    try {
      // Paso 1: Obtener URLs pre-firmadas
      setOverallStatus('📋 Generando URLs de subida...')
      const filesInfo = selectedFiles.map(file => ({
        name: file.name,
        type: file.type,
        size: file.size
      }))

      const urlResponse = await fetch('/api/dashboard/upload-files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ files: filesInfo })
      })

      if (!urlResponse.ok) {
        throw new Error(`Error obteniendo URLs: ${urlResponse.status}`)
      }

      const urlResult = await urlResponse.json()
      const { uploadUrls, jobId: newJobId } = urlResult
      setJobId(newJobId)

      // Paso 2: Subir archivos a R2 usando las URLs pre-firmadas
      setOverallStatus('📤 Subiendo archivos a R2...')
      
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i]
        const uploadInfo = uploadUrls[i]
        
        setUploadProgress(prev => prev.map((p, index) => 
          index === i ? { ...p, status: 'uploading' } : p
        ))

        try {
          await uploadFileToR2(file, uploadInfo.uploadUrl, (progress) => {
            setUploadProgress(prev => prev.map((p, index) => 
              index === i ? { ...p, progress } : p
            ))
          })

          setUploadProgress(prev => prev.map((p, index) => 
            index === i ? { ...p, status: 'uploaded', progress: 100 } : p
          ))

        } catch (error) {
          console.error(`Error subiendo ${file.name}:`, error)
          setUploadProgress(prev => prev.map((p, index) => 
            index === i ? { ...p, status: 'error', message: `Error: ${error}` } : p
          ))
          throw error
        }
      }

      // Paso 3: Iniciar procesamiento en background
      setOverallStatus('🔄 Iniciando procesamiento en background...')
      
      const processResponse = await fetch('/api/dashboard/process-uploaded-files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          files: uploadUrls.map((u: { fileName: string; key: string; table: string }) => ({ fileName: u.fileName, key: u.key, table: u.table })),
          jobId: newJobId
        })
      })

      if (!processResponse.ok) {
        throw new Error(`Error iniciando procesamiento: ${processResponse.status}`)
      }

      const processResult = await processResponse.json()
      
      if (processResult.status === 'processing_started') {
        setOverallStatus('⏳ Procesamiento iniciado. Estimado: 3-8 minutos...')
        setUploadProgress(prev => prev.map(p => ({ ...p, status: 'processing' })))
        
        // Iniciar verificación del estado
        await checkProcessingStatus(newJobId)
      } else {
        throw new Error('Respuesta inesperada del servidor')
      }

    } catch (error) {
      console.error('Error en el proceso de subida:', error)
      setOverallStatus(`❌ Error: ${error instanceof Error ? error.message : 'Error desconocido'}`)
      setUploadProgress(prev => prev.map(p => ({ ...p, status: 'error' })))
    } finally {
      setIsUploading(false)
    }
  }

  const resetModal = () => {
    setSelectedFiles([])
    setUploadProgress([])
    setIsUploading(false)
    setJobId(null)
    setOverallStatus('')
  }

  const handleClose = () => {
    if (!isUploading) {
      resetModal()
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-2xl mx-4 p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Subir Archivos de Datos</h3>
          {!isUploading && (
            <Button variant="outline" size="sm" onClick={handleClose}>
              ✕
            </Button>
          )}
        </div>

        <div className="space-y-4">
          {!isUploading && selectedFiles.length === 0 && (
            <div>
              <label className="block text-sm font-medium mb-2">
                Seleccionar archivos Excel (.xlsx) o CSV
              </label>
              <input
                type="file"
                multiple
                accept=".xlsx,.xls,.csv"
                onChange={handleFileSelect}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              <p className="text-xs text-gray-500 mt-1">
                Archivos CCM y PRR en formato Excel o CSV (separado por punto y coma)
              </p>
            </div>
          )}

          {selectedFiles.length > 0 && (
            <div>
              <h4 className="font-medium mb-2">Archivos seleccionados:</h4>
              <div className="space-y-2">
                {uploadProgress.map((progress, index) => (
                  <div key={index} className="border rounded p-3">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-medium">{progress.fileName}</span>
                      <span className="text-xs text-gray-500">
                        {progress.status === 'pending' && '⏳ Pendiente'}
                        {progress.status === 'uploading' && '📤 Subiendo'}
                        {progress.status === 'uploaded' && '✅ Subido'}
                        {progress.status === 'processing' && '🔄 Procesando'}
                        {progress.status === 'completed' && '✅ Completado'}
                        {progress.status === 'error' && '❌ Error'}
                      </span>
                    </div>
                    {(progress.status === 'uploading' || progress.status === 'uploaded') && (
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${progress.progress}%` }}
                        />
                      </div>
                    )}
                    {progress.message && (
                      <p className="text-xs text-red-500 mt-1">{progress.message}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {overallStatus && (
            <div className="bg-blue-50 border border-blue-200 rounded p-3">
              <p className="text-sm text-blue-700">{overallStatus}</p>
              {jobId && (
                <p className="text-xs text-blue-500 mt-1">Job ID: {jobId}</p>
              )}
            </div>
          )}

          <div className="flex justify-end space-x-2 pt-4">
            {!isUploading && selectedFiles.length === 0 && (
              <Button variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
            )}
            
            {!isUploading && selectedFiles.length > 0 && (
              <>
                <Button variant="outline" onClick={resetModal}>
                  Limpiar
                </Button>
                <Button onClick={handleUpload}>
                  Subir Archivos
                </Button>
              </>
            )}
            
            {isUploading && (
              <div className="text-sm text-gray-500">
                ⏳ Procesamiento en curso... No cierre esta ventana.
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  )
} 