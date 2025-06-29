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

interface JobStatus {
	status: 'processing' | 'completed' | 'error';
	progress: number;
	message: string;
}

interface ProcessResponse {
	jobId: string;
	error?: string;
}

interface UploadUrlResponse {
	uploadUrls: { fileName: string; uploadUrl: string; key: string; table: string }[];
	jobId: string;
}

export function FileUploadModal({ isOpen, onClose, onUploadComplete }: FileUploadModalProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [jobId, setJobId] = useState<string | null>(null)
  const [overallStatus, setOverallStatus] = useState('')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!jobId || !isUploading) return;

    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/dashboard/upload-status?jobId=${jobId}`);
        if (!response.ok) {
          if (response.status === 404) {
            console.log(`Job ${jobId} aún no encontrado, reintentando...`);
            return;
          }
          throw new Error('Error al obtener el estado del job');
        }

        const data: JobStatus = await response.json();
        
        setOverallStatus(`${data.status} - ${data.progress}%: ${data.message}`);

        if (data.status === 'completed' || data.status === 'error') {
          setIsUploading(false);
          setJobId(null);
          clearInterval(interval);
          if (data.status === 'completed' && onUploadComplete) {
            onUploadComplete();
          }
        }
      } catch (error) {
        console.error('Error en el polling:', error);
        setOverallStatus('Error al verificar el estado.');
        setIsUploading(false);
        setJobId(null);
        clearInterval(interval);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [jobId, isUploading, onUploadComplete]);

  if (!isOpen || !mounted) return null

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    setSelectedFiles(files)
    setUploadProgress(files.map(file => ({
      fileName: file.name,
      progress: 0,
      status: 'pending'
    })))
  }

  const uploadFileToR2 = async (file: File, url: string, onProgress: (progress: number) => void): Promise<void> => {
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
      
      xhr.open('PUT', url)
      xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream')
      xhr.send(file)
    })
  }

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return

    setIsUploading(true)
    setOverallStatus('🚀 Iniciando proceso de subida...')

    try {
      // Paso 1: Obtener URLs pre-firmadas
      setOverallStatus('📋 Generando URLs de subida...')
      const urlResponse = await fetch('/api/dashboard/upload-files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          files: selectedFiles.map(f => ({ name: f.name, type: f.type, size: f.size }))
        })
      });

      if (!urlResponse.ok) {
        throw new Error('Error al obtener las URLs de subida.');
      }

      const urlResult: UploadUrlResponse = await urlResponse.json();
      const { uploadUrls } = urlResult;

      // Paso 2: Subir archivos a R2
      setOverallStatus('📤 Subiendo archivos a R2...')
      const uploadPromises = selectedFiles.map((file, i) => {
        const uploadInfo = uploadUrls.find(u => u.fileName === file.name);
        if (!uploadInfo) {
          throw new Error(`No se encontró URL de subida para ${file.name}`);
        }
        return uploadFileToR2(file, uploadInfo.uploadUrl, (progress) => {
          setUploadProgress(prev => prev.map((p, index) => 
            index === i ? { ...p, progress, status: progress === 100 ? 'uploaded' : 'uploading' } : p
          ));
        });
      });
      await Promise.all(uploadPromises);
      setOverallStatus('✅ Archivos subidos a R2. Disparando procesamiento...');

      // Paso 3: Disparar el workflow
      const filesToProcess = uploadUrls.map(u => ({
        key: u.key,
        table: u.fileName.toLowerCase().includes('ccm') ? 'table_ccm' : 'table_prr'
      }));
      
      const processResponse = await fetch('/api/dashboard/process-uploaded-files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ files: filesToProcess }),
      });

      if (!processResponse.ok) {
        const errorData: { error?: string } = await processResponse.json();
        throw new Error(errorData.error || 'Error al iniciar el procesamiento.');
      }
      
      const processData: ProcessResponse = await processResponse.json();
      setJobId(processData.jobId); // Inicia el polling
      setOverallStatus('Proceso iniciado, esperando actualización de estado...');

    } catch (error) {
      console.error('Error en el proceso de subida:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      setOverallStatus(`❌ Error: ${errorMessage}`);
      setIsUploading(false); // Detener el estado de carga en caso de error
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

  const modalContent = (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
      <Card className="w-full max-w-2xl mx-4 p-6 relative z-[10000] bg-white shadow-2xl">
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
              <div className="mt-4 text-center">
                <p className="text-sm text-gray-500">Procesando archivos en segundo plano...</p>
                <p className="text-sm font-medium text-gray-700 mt-2">{overallStatus}</p>
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  )

  return createPortal(modalContent, document.body)
} 