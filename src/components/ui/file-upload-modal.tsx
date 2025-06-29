'use client'

import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
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
  const [overallStatus, setOverallStatus] = useState<string>('')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  const handleClose = () => {
    if (isUploading) return
    resetModal()
    onClose()
  }

  const resetModal = () => {
    setSelectedFiles([])
    setUploadProgress([])
    setIsUploading(false)
    setOverallStatus('')
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      setSelectedFiles(Array.from(event.target.files))
    }
  }

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return
    setIsUploading(true)
    setOverallStatus('🚀 Iniciando proceso de subida...')
    
    try {
      // Paso 1: Obtener URLs pre-firmadas
      const urlResponse = await fetch('/api/dashboard/generate-upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ files: selectedFiles.map(f => f.name) }),
      })
      if (!urlResponse.ok) throw new Error('Error generando URLs de subida.')
      const { uploadUrls }: { uploadUrls: { key: string; url: string; table: string }[] } = await urlResponse.json()

      setUploadProgress(selectedFiles.map(file => ({ fileName: file.name, progress: 0, status: 'pending' })))

      // Paso 2: Subir archivos a R2
      setOverallStatus('📤 Subiendo archivos a R2...')
      await Promise.all(
        selectedFiles.map((file, i) => {
          return uploadFileToR2(file, uploadUrls[i].url, (progress) => {
            setUploadProgress(prev => prev.map((p, index) => (index === i ? { ...p, progress } : p)))
          }).then(() => {
            setUploadProgress(prev => prev.map((p, index) => (index === i ? { ...p, status: 'uploaded' } : p)))
          })
        })
      )

      // Paso 3: Disparar el workflow de GitHub
      setOverallStatus('⏳ Disparando proceso en background...')
      const processRes = await fetch('/api/dashboard/process-uploaded-files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ files: uploadUrls.map(u => ({ key: u.key, table: u.table })) }),
      })
      if (!processRes.ok) throw new Error('Error al iniciar el procesamiento en background.')

      const { repo }: { repo: string } = await processRes.json()
      
      // Paso 4: Monitorear el estado
      setOverallStatus('⚙️ Procesamiento en curso... (Esto puede tardar varios minutos)')
      pollJobStatus(repo, uploadUrls.map(u => u.key))

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido'
      setOverallStatus(`❌ Error: ${message}`)
      setIsUploading(false)
    }
  }

  const pollJobStatus = (repo: string, fileKeys: string[]) => {
    // Por simplicidad, rastreamos el primer archivo. En una implementación más compleja
    // se podría rastrear cada archivo individualmente.
    const primaryFileKey = fileKeys[0]

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/dashboard/job-status?repo=${repo}&fileKey=${primaryFileKey}`)
        if (!res.ok) return // Seguir intentando en el próximo intervalo

        const data: { status: string; conclusion: string | null } = await res.json()
        
        if (data.status === 'completed') {
          clearInterval(interval)
          if (data.conclusion === 'success') {
            setOverallStatus('✅ ¡Proceso completado exitosamente!')
            setUploadProgress(prev => prev.map(p => ({ ...p, status: 'completed' })))
            setIsUploading(false)
            onUploadComplete?.()
          } else {
            setOverallStatus(`❌ Error en el procesamiento: ${data.conclusion || 'desconocido'}.`)
            setUploadProgress(prev => prev.map(p => ({ ...p, status: 'error' })))
            setIsUploading(false)
          }
        }
      } catch (error) {
        console.error("Error en polling:", error)
      }
    }, 5000) // Consultar cada 5 segundos
  }

  async function uploadFileToR2(file: File, url: string, onProgress: (progress: number) => void) {
    return new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      xhr.open('PUT', url, true)
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100)
          onProgress(progress)
        }
      }
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          onProgress(100)
          resolve()
        } else {
          reject(new Error(`Error en la subida: ${xhr.statusText}`))
        }
      }
      xhr.onerror = () => reject(new Error('Error de red durante la subida.'))
      xhr.send(file)
    })
  }

  if (!isOpen || !mounted) return null

  return createPortal(
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
      <Card className="w-full max-w-2xl mx-4 p-6 bg-white dark:bg-gray-800 shadow-2xl relative z-[10000]">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Subir Archivos de Datos</h3>
          {!isUploading && (
            <Button variant="outline" size="sm" onClick={handleClose}>✕</Button>
          )}
        </div>

        <div className="space-y-4">
          {!isUploading && selectedFiles.length === 0 && (
            <div>
              <label htmlFor="file-upload" className="block text-sm font-medium mb-2">
                Seleccionar archivos Excel (.xlsx) o CSV
              </label>
              <input
                id="file-upload"
                type="file"
                multiple
                accept=".xlsx,.xls,.csv"
                onChange={handleFileChange}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
            </div>
          )}

          {selectedFiles.length > 0 && !isUploading && (
            <div className="space-y-2">
              <h4 className="font-semibold">Archivos Seleccionados:</h4>
              <ul className="list-disc list-inside bg-gray-50 p-3 rounded-md">
                {selectedFiles.map((file, i) => (
                  <li key={i} className="text-sm">{file.name}</li>
                ))}
              </ul>
            </div>
          )}
          
          {isUploading && (
            <div className="space-y-4">
              <h4 className="font-semibold text-center">{overallStatus}</h4>
              {uploadProgress.map((p, i) => (
                <div key={i}>
                  <div className="flex justify-between text-sm mb-1">
                    <span>{p.fileName}</span>
                    <span>{p.status}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${p.progress}%` }}></div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end space-x-3">
          <Button variant="outline" onClick={handleClose} disabled={isUploading}>Cancelar</Button>
          <Button onClick={handleUpload} disabled={selectedFiles.length === 0 || isUploading}>
            {isUploading ? 'Procesando...' : 'Subir y Procesar'}
          </Button>
        </div>
      </Card>
    </div>,
    document.body
  )
} 