'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Upload, X, FileCheck, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'
import { useToast } from './toast'

interface FileUploadModalProps {
  isOpen: boolean
  onClose: () => void
  onUploadComplete?: () => void
}

interface FileState {
  ccm: File | null
  prr: File | null
}

interface UploadProgress {
  uploading: boolean
  progress: number
  step: string
  error?: string
  success?: boolean
}

export function FileUploadModal({ isOpen, onClose, onUploadComplete }: FileUploadModalProps) {
  const [files, setFiles] = useState<FileState>({ ccm: null, prr: null })
  const [uploadProgress, setUploadProgress] = useState<UploadProgress>({
    uploading: false,
    progress: 0,
    step: ''
  })
  const [isMounted, setIsMounted] = useState(false)
  const [jobId, setJobId] = useState<string | null>(null)
  
  const ccmInputRef = useRef<HTMLInputElement>(null)
  const prrInputRef = useRef<HTMLInputElement>(null)
  const { success, error } = useToast()

  const resetFiles = useCallback(() => {
    setFiles({ ccm: null, prr: null })
    setUploadProgress({ uploading: false, progress: 0, step: '' })
    setJobId(null)
  }, [])

  const resetAndClose = useCallback(() => {
    setFiles({ ccm: null, prr: null })
    setUploadProgress({ uploading: false, progress: 0, step: '' })
    setJobId(null)
    onClose()
  }, [onClose])

  const handleUpload = useCallback(async () => {
    if (!files.ccm && !files.prr) {
      error('Por favor selecciona al menos un archivo.')
      return
    }

    setUploadProgress({
      uploading: true,
      progress: 0,
      step: 'Preparando subida...',
      error: undefined,
      success: undefined
    })

    try {
      setUploadProgress(prev => ({ ...prev, step: 'Generando URLs de subida...', progress: 10 }))
      
      const fileInfos: { name: string, type: string, size: number }[] = []
      if (files.ccm) fileInfos.push({ name: files.ccm.name, type: files.ccm.type, size: files.ccm.size })
      if (files.prr) fileInfos.push({ name: files.prr.name, type: files.prr.type, size: files.prr.size })

      const urlResponse = await fetch('/api/dashboard/upload-files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ files: fileInfos }),
      })

      if (!urlResponse.ok) throw new Error('No se pudieron generar las URLs de subida.')

      const urlResult = await urlResponse.json()
      const uploadUrls: Array<{fileName: string; uploadUrl: string}> = urlResult.uploadUrls

      setUploadProgress(prev => ({ ...prev, step: 'Subiendo archivos a almacenamiento seguro...', progress: 30 }))
      
      const uploadPromises: Promise<Response>[] = []
      
      if (files.ccm) {
        const ccmUrlData = uploadUrls.find(u => u.fileName === files.ccm!.name)
        if (ccmUrlData) {
          uploadPromises.push(
            fetch(ccmUrlData.uploadUrl, { method: 'PUT', body: files.ccm, headers: { 'Content-Type': files.ccm.type } })
          )
        }
      }

      if (files.prr) {
        const prrUrlData = uploadUrls.find(u => u.fileName === files.prr!.name)
        if (prrUrlData) {
          uploadPromises.push(
            fetch(prrUrlData.uploadUrl, { method: 'PUT', body: files.prr, headers: { 'Content-Type': files.prr.type } })
          )
        }
      }

      await Promise.all(uploadPromises)
      
      setUploadProgress(prev => ({ ...prev, step: 'Iniciando procesamiento en servidor...', progress: 70 }))

      const processResponse = await fetch('/api/dashboard/process-uploaded-files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ files: urlResult.uploadUrls }),
      })

      if (!processResponse.ok) throw new Error('Error al iniciar el procesamiento.')

      const result = await processResponse.json()
      setJobId(result.jobId)

      setUploadProgress(prev => ({ ...prev, progress: 80, step: 'Tarea creada. Monitoreando progreso...' }))

    } catch (err) {
      console.error('Error durante la subida:', err)
      const message = err instanceof Error ? err.message : 'Error desconocido durante la subida'
      setUploadProgress({ uploading: false, progress: 0, step: '', error: message })
      error(message)
    }
  }, [files, error])

  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    if (!jobId) return;

    const interval = setInterval(async () => {
      try {
        const statusResponse = await fetch(`/api/dashboard/upload-status?jobId=${jobId}`);
        const status = await statusResponse.json();

        if (!statusResponse.ok) {
          throw new Error(status.message || 'Error al verificar el estado.');
        }

        setUploadProgress(prev => ({
          ...prev,
          step: status.message || prev.step,
          progress: status.progress || prev.progress,
          error: status.status === 'error' ? status.error : undefined,
          success: status.status === 'completed'
        }));

        if (status.status === 'completed' || status.status === 'error') {
          clearInterval(interval);
          setJobId(null);
          if (status.status === 'completed') {
            success('¡Archivos procesados exitosamente!');
            setTimeout(() => {
              onUploadComplete?.();
              onClose();
              resetFiles();
            }, 2000);
          } else {
            error(status.error || 'Ocurrió un error en el servidor.');
          }
        }
      } catch (e) {
        console.error('Error durante el polling de estado:', e);
        error('Error de red al verificar el estado.');
        clearInterval(interval);
        setJobId(null);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [jobId, onUploadComplete, onClose, success, error, resetFiles]);

  if (!isMounted || !isOpen) {
    return null
  }

  const handleFileSelect = (type: 'ccm' | 'prr', file: File) => {
    const validExtensions = ['.xlsx', '.xls', '.csv']
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase()
    
    if (!validExtensions.includes(fileExtension)) {
      error('Solo se permiten archivos Excel (.xlsx, .xls) o CSV (.csv)')
      return
    }

    if (!file.name.toLowerCase().includes(type)) {
      error(`El archivo ${type.toUpperCase()} debe contener "${type.toUpperCase()}" en el nombre`)
      return
    }

    setFiles(prev => ({ ...prev, [type]: file }))
    success(`Archivo ${type.toUpperCase()} seleccionado: ${file.name}`)
  }

  const handleDrop = (e: React.DragEvent, type: 'ccm' | 'prr') => {
    e.preventDefault()
    const droppedFiles = Array.from(e.dataTransfer.files)
    if (droppedFiles.length > 0) {
      handleFileSelect(type, droppedFiles[0])
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const FileDropZone = ({ type, file }: { type: 'ccm' | 'prr', file: File | null }) => (
    <div
      className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
        file 
          ? 'border-green-300 bg-green-50' 
          : 'border-gray-300 hover:border-gray-400 bg-gray-50'
      }`}
      onDrop={(e) => handleDrop(e, type)}
      onDragOver={handleDragOver}
    >
      <input
        ref={type === 'ccm' ? ccmInputRef : prrInputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        onChange={(e) => {
          const selectedFile = e.target.files?.[0]
          if (selectedFile) handleFileSelect(type, selectedFile)
        }}
        className="hidden"
      />
      
      {file ? (
        <div className="space-y-2">
          <FileCheck className="mx-auto h-8 w-8 text-green-600" />
          <p className="text-sm font-medium text-green-800">{file.name}</p>
          <p className="text-xs text-green-600">{(file.size / 1024 / 1024).toFixed(1)} MB</p>
        </div>
      ) : (
        <div className="space-y-2">
          <Upload className="mx-auto h-8 w-8 text-gray-400" />
          <p className="text-sm text-gray-600">
            Arrastra el archivo <span className="font-semibold">{type.toUpperCase()}</span> aquí o{' '}
            <button
              onClick={() => {
                if (type === 'ccm') ccmInputRef.current?.click()
                else prrInputRef.current?.click()
              }}
              className="text-blue-600 hover:text-blue-500 font-medium"
            >
              haz clic para seleccionar
            </button>
          </p>
          <p className="text-xs text-gray-500">
            Formato: Excel (.xlsx, .xls) o CSV (.csv)
          </p>
        </div>
      )}
    </div>
  )

  const ModalContent = (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Subir Archivos de Datos</h2>
            <p className="text-sm text-gray-500 mt-1">
              Carga los archivos CCM y PRR para actualizar las tablas
            </p>
          </div>
          <button
            onClick={resetAndClose}
            disabled={uploadProgress.uploading}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* File Upload Areas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Archivo CCM
              </label>
              <FileDropZone type="ccm" file={files.ccm} />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Archivo PRR
              </label>
              <FileDropZone type="prr" file={files.prr} />
            </div>
          </div>

          {/* Progress Section */}
          {(uploadProgress.uploading || uploadProgress.error || uploadProgress.success) && (
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                {uploadProgress.uploading && <Loader2 className="h-4 w-4 animate-spin text-blue-600" />}
                {uploadProgress.error && <AlertCircle className="h-4 w-4 text-red-600" />}
                {uploadProgress.success && <CheckCircle2 className="h-4 w-4 text-green-600" />}
                <span className="text-sm font-medium">
                  {uploadProgress.error ? 'Error' : uploadProgress.success ? 'Completado' : 'Procesando'}
                </span>
              </div>
              
              {uploadProgress.uploading && (
                <div className="mb-2">
                  <div className="bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress.progress}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-600 mt-1">{uploadProgress.progress}%</p>
                </div>
              )}
              
              <p className="text-sm text-gray-700">
                {uploadProgress.error || uploadProgress.step}
              </p>
            </div>
          )}

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-sm font-medium text-blue-800 mb-2">ℹ️ Información importante:</h3>
            <ul className="text-xs text-blue-700 space-y-1">
              <li>• Los archivos deben ser consolidado_final_CCM_personal.xlsx y consolidado_final_PRR_personal.xlsx</li>
              <li>• Este proceso borrará todos los datos existentes en table_ccm y table_prr</li>
              <li>• Los archivos se procesan completamente en segundo plano (3-8 minutos)</li>
              <li>• Sistema optimizado para archivos grandes sin timeouts</li>
              <li>• Se crea backup automático en Cloudflare R2 para seguridad</li>
              <li>• Los datos aparecerán en el dashboard automáticamente cuando esté listo</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={resetFiles}
            disabled={uploadProgress.uploading}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 disabled:opacity-50"
          >
            Limpiar archivos
          </button>
          
          <div className="flex gap-3">
            <button
              onClick={resetAndClose}
              disabled={uploadProgress.uploading}
              className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleUpload}
              disabled={uploadProgress.uploading || (!files.ccm && !files.prr)}
              className="px-6 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {uploadProgress.uploading && <Loader2 className="h-4 w-4 animate-spin" />}
              {uploadProgress.uploading ? 'Procesando...' : 'Subir y Procesar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  return createPortal(ModalContent, document.body)
} 