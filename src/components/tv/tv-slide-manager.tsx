'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { TvKpiOverview } from './tv-kpi-overview'
import { TvPendientesView } from './tv-pendientes-view'
import { TvIngresosView } from './tv-ingresos-view'
import { TvProduccionView } from './tv-produccion-view'
import { TvAvancePendientesView } from './tv-avance-pendientes-view'
import { TvAnalysisView } from './tv-analysis-view'
import { useTvAutoRefresh } from '@/hooks/use-tv-auto-refresh'

interface TvSlideManagerProps {
  process: 'ccm' | 'prr' | 'spe' | 'sol'
  isPlaying: boolean
  slideInterval: number // en milisegundos
}

interface Slide {
  id: string
  title: string
  component: React.ComponentType<{ process: string }>
  duration?: number // Override del interval global si es necesario
}

const slides: Slide[] = [
  {
    id: 'kpis',
    title: 'Indicadores Clave',
    component: TvKpiOverview,
  },
  {
    id: 'pendientes',
    title: 'Expedientes Pendientes',
    component: TvPendientesView,
  },
  {
    id: 'ingresos',
    title: 'Ingresos de Expedientes',
    component: TvIngresosView,
  },
  {
    id: 'produccion',
    title: 'Producción y Rendimiento',
    component: TvProduccionView,
  },
  {
    id: 'avance-pendientes',
    title: 'Avance de Pendientes',
    component: TvAvancePendientesView,
  },
  {
    id: 'analysis',
    title: 'Análisis y Tendencias',
    component: TvAnalysisView,
  },
]

export function TvSlideManager({ process, isPlaying, slideInterval }: TvSlideManagerProps) {
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0)
  const [progress, setProgress] = useState(0)
  const [timeRemaining, setTimeRemaining] = useState(slideInterval / 1000)

  // Auto-refresh hook para mantener datos actualizados
  useTvAutoRefresh({
    intervalMinutes: 5, // Refrescar cada 5 minutos
    enabled: true,
    process: process
  })

  const currentSlide = slides[currentSlideIndex]
  const CurrentComponent = currentSlide.component

  const nextSlide = useCallback(() => {
    setCurrentSlideIndex((prev) => (prev + 1) % slides.length)
    setProgress(0)
    setTimeRemaining(slideInterval / 1000)
  }, [slideInterval])

  const goToSlide = (index: number) => {
    setCurrentSlideIndex(index)
    setProgress(0)
    setTimeRemaining(slideInterval / 1000)
  }

  // Auto-advance slides
  useEffect(() => {
    if (!isPlaying) return

    const interval = setInterval(() => {
      setProgress((prev) => {
        const newProgress = prev + (100 / (slideInterval / 100))
        if (newProgress >= 100) {
          nextSlide()
          return 0
        }
        return newProgress
      })
      
      setTimeRemaining((prev) => {
        const newTime = prev - 0.1
        return newTime <= 0 ? slideInterval / 1000 : newTime
      })
    }, 100)

    return () => clearInterval(interval)
  }, [isPlaying, slideInterval, nextSlide])

  // Reset progress when slide interval changes
  useEffect(() => {
    setProgress(0)
    setTimeRemaining(slideInterval / 1000)
  }, [slideInterval])

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Slide Indicator */}
      <div className="absolute top-0 left-0 right-0 z-30">
        {/* Progress Bar */}
        <div className="h-1 bg-white/20">
          <motion.div
            className="h-full bg-gradient-to-r from-blue-400 to-purple-500"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.1, ease: 'linear' }}
          />
        </div>
        
        {/* Slide Info */}
        <div className="flex items-center justify-between p-6 bg-gradient-to-b from-black/50 to-transparent">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
              <span className="text-white/90 font-medium">
                {process.toUpperCase()} - {currentSlide.title}
              </span>
            </div>
            <div className="text-white/70 text-sm">
              {Math.ceil(timeRemaining)}s restantes
            </div>
          </div>
          
          {/* Slide Navigation Dots */}
          <div className="flex items-center gap-2">
            {slides.map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  index === currentSlideIndex
                    ? 'bg-white scale-150'
                    : 'bg-white/40 hover:bg-white/60'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Slide Content */}
      <div className="pt-20">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlideIndex}
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            transition={{ 
              duration: 0.6,
              ease: [0.4, 0, 0.2, 1]
            }}
            className="h-full"
          >
            <CurrentComponent process={process} />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Playback Status */}
      {!isPlaying && (
        <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-30">
          <div className="bg-black/80 backdrop-blur-sm text-white px-6 py-3 rounded-full flex items-center gap-3">
            <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
            <span className="font-medium">Presentación en Pausa</span>
          </div>
        </div>
      )}

      {/* Process Badge */}
      <div className="absolute top-6 right-6 z-30">
        <div className="tv-safe-bg text-white px-4 py-2 rounded-lg">
          <div className="text-sm opacity-80">Proceso</div>
          <div className="text-lg font-bold">{process.toUpperCase()}</div>
        </div>
      </div>
    </div>
  )
} 