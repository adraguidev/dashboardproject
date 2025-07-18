'use client'

import React, { useState, useEffect } from 'react'
import { TvDashboardLayout } from '@/components/tv/tv-dashboard-layout'
import { TvSlideManager } from '@/components/tv/tv-slide-manager'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Settings, Play, Pause, SkipForward, Maximize2 } from 'lucide-react'

export default function TvDashboardPage() {
  const [isPlaying, setIsPlaying] = useState(true)
  const [slideInterval, setSlideInterval] = useState(15) // segundos
  const [showControls, setShowControls] = useState(true)
  const [selectedProcess, setSelectedProcess] = useState<'ccm' | 'prr' | 'spe' | 'sol'>('ccm')
  const [isFullscreen, setIsFullscreen] = useState(false)

  // Auto-hide controls after 5 seconds of inactivity
  useEffect(() => {
    let timeoutId: NodeJS.Timeout
    
    const resetTimeout = () => {
      clearTimeout(timeoutId)
      setShowControls(true)
      timeoutId = setTimeout(() => {
        setShowControls(false)
      }, 5000)
    }

    const handleMouseMove = () => resetTimeout()
    const handleKeyPress = () => resetTimeout()

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('keydown', handleKeyPress)
    
    resetTimeout()

    return () => {
      clearTimeout(timeoutId)
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('keydown', handleKeyPress)
    }
  }, [])

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen()
        setIsFullscreen(true)
      } else {
        await document.exitFullscreen()
        setIsFullscreen(false)
      }
    } catch (error) {
      console.error('Error toggling fullscreen:', error)
    }
  }

  const handleKeyPress = (event: KeyboardEvent) => {
    switch (event.key) {
      case ' ': // Spacebar
        event.preventDefault()
        setIsPlaying(!isPlaying)
        break
      case 'f':
      case 'F':
        event.preventDefault()
        toggleFullscreen()
        break
      case 'Escape':
        if (isFullscreen) {
          document.exitFullscreen()
          setIsFullscreen(false)
        }
        break
    }
  }

  useEffect(() => {
    document.addEventListener('keydown', handleKeyPress)
    return () => {
      document.removeEventListener('keydown', handleKeyPress)
    }
  }, [isPlaying, isFullscreen])

  return (
    <TvDashboardLayout>
      {/* Controls Overlay */}
      <div 
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          showControls ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'
        }`}
      >
        <div className="bg-black/80 backdrop-blur-sm text-white p-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold">UFSM Dashboard TV</h1>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm">En Vivo</span>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {/* Process Selector */}
              <select
                value={selectedProcess}
                onChange={(e) => setSelectedProcess(e.target.value as any)}
                className="px-3 py-2 bg-white/20 rounded-lg text-white border border-white/30 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="ccm">CCM</option>
                <option value="prr">PRR</option>
                <option value="spe">SPE</option>
                <option value="sol">VISAS</option>
              </select>

              {/* Playback Controls */}
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="text-white hover:bg-white/20"
                >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </Button>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleFullscreen}
                  className="text-white hover:bg-white/20"
                >
                  <Maximize2 className="w-4 h-4" />
                </Button>
              </div>

              {/* Interval Selector */}
              <select
                value={slideInterval}
                onChange={(e) => setSlideInterval(Number(e.target.value))}
                className="px-2 py-1 bg-white/20 rounded text-white border border-white/30 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={10}>10s</option>
                <option value={15}>15s</option>
                <option value={30}>30s</option>
                <option value={60}>1m</option>
                <option value={120}>2m</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <TvSlideManager
          process={selectedProcess}
          isPlaying={isPlaying}
          slideInterval={slideInterval * 1000} // convertir a ms
        />
      </div>

      {/* Instructions Overlay (only show when controls are visible) */}
      {showControls && (
        <div className="fixed bottom-4 right-4 bg-black/60 backdrop-blur-sm text-white p-3 rounded-lg text-sm">
          <div className="space-y-1">
            <div><kbd className="px-2 py-0.5 bg-white/20 rounded text-xs">ESPACIO</kbd> Play/Pause</div>
            <div><kbd className="px-2 py-0.5 bg-white/20 rounded text-xs">F</kbd> Pantalla Completa</div>
            <div><kbd className="px-2 py-0.5 bg-white/20 rounded text-xs">ESC</kbd> Salir</div>
          </div>
        </div>
      )}
    </TvDashboardLayout>
  )
} 