import React from 'react'
import { cn } from '@/lib/utils'
import { Filter } from 'lucide-react'

interface FilterSelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  containerClassName?: string
  icon?: React.ReactNode
}

export const FilterSelect = React.forwardRef<
  HTMLSelectElement,
  FilterSelectProps
>(({ className, containerClassName, children, icon, ...props }, ref) => {
  return (
    <div className={cn('relative w-full sm:w-64', containerClassName)}>
      <div className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 transform text-gray-400">
        {icon || <Filter className="h-4 w-4" />}
      </div>
      <select
        ref={ref}
        className={cn(
          'h-10 w-full appearance-none rounded-md border border-gray-300 bg-white py-2 pl-10 pr-8 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500',
          className
        )}
        {...props}
      >
        {children}
      </select>
    </div>
  )
})

FilterSelect.displayName = 'FilterSelect' 