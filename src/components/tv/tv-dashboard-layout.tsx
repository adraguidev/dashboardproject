'use client'

import React, { ReactNode } from 'react'

interface TvDashboardLayoutProps {
  children: ReactNode
}

export function TvDashboardLayout({ children }: TvDashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 font-sans antialiased">
      {/* Global TV Styles */}
      <style jsx global>{`
        /* TV-optimized typography */
        * {
          font-size: clamp(14px, 1.2vw, 24px);
          line-height: 1.4;
        }
        
        h1 { font-size: clamp(24px, 3.5vw, 48px) !important; }
        h2 { font-size: clamp(20px, 3vw, 40px) !important; }
        h3 { font-size: clamp(18px, 2.5vw, 32px) !important; }
        h4 { font-size: clamp(16px, 2vw, 28px) !important; }
        
        /* Enhanced contrast for TV viewing */
        .tv-high-contrast {
          filter: contrast(1.2) brightness(1.1);
        }
        
        /* Remove cursor for TV mode */
        * {
          cursor: none !important;
        }
        
        /* TV-safe colors */
        .tv-safe-text {
          color: #f8fafc;
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8);
        }
        
        .tv-safe-bg {
          background: linear-gradient(135deg, 
            rgba(51, 65, 85, 0.95) 0%, 
            rgba(30, 41, 59, 0.95) 50%, 
            rgba(15, 23, 42, 0.95) 100%
          );
          backdrop-filter: blur(8px);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        /* Larger interactive elements */
        .tv-button {
          min-height: 48px;
          min-width: 120px;
          font-size: clamp(14px, 1.5vw, 20px);
          font-weight: 600;
          border-radius: 12px;
          transition: all 0.3s ease;
        }
        
        /* Enhanced chart readability */
        .recharts-text {
          font-size: clamp(12px, 1.2vw, 18px) !important;
          font-weight: 500 !important;
          fill: #e2e8f0 !important;
        }
        
        .recharts-legend-item-text {
          font-size: clamp(14px, 1.4vw, 20px) !important;
          font-weight: 600 !important;
        }
        
        /* Table enhancements */
        .tv-table {
          font-size: clamp(14px, 1.3vw, 20px) !important;
        }
        
        .tv-table th {
          font-size: clamp(16px, 1.5vw, 22px) !important;
          font-weight: 700 !important;
          padding: 16px 20px !important;
        }
        
        .tv-table td {
          padding: 12px 20px !important;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1) !important;
        }
        
        /* Hide scrollbars for clean TV presentation */
        ::-webkit-scrollbar {
          display: none;
        }
        
        * {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
      
      {children}
    </div>
  )
} 