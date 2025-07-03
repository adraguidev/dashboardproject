'use client'

import { usePathname } from 'next/navigation'
import { useEffect } from 'react'
import posthog from 'posthog-js'

interface PostHogProviderProps {
  children: React.ReactNode
}

export default function PostHogProvider({ children }: PostHogProviderProps) {
  const pathname = usePathname()

  // Initialize PostHog once on the client
  useEffect(() => {
    if (typeof window === 'undefined') return

    // Avoid re-initializing if already done
    if (!(posthog as any).__initialized) {
      posthog.init(
        process.env.NEXT_PUBLIC_POSTHOG_KEY || '',
        {
          api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com',
        }
      )
      ;(posthog as any).__initialized = true
    }
  }, [])

  // Capture a pageview every time the route/pathname changes
  useEffect(() => {
    if (!pathname) return
    posthog.capture('$pageview', { url: pathname })
  }, [pathname])

  return <>{children}</>
} 