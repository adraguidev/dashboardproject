import { Suspense } from 'react'
import { GestionEquiposContent } from '@/components/ui/gestion-equipos-content'

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  )
}

export default function GestionEquiposPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <GestionEquiposContent />
    </Suspense>
  )
}