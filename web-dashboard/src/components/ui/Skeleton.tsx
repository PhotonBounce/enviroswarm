import React from 'react'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string
}

export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-md bg-muted',
        className
      )}
      {...props}
    >
      <motion.div
        className="absolute inset-0 -translate-x-full"
        style={{
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent)',
        }}
        animate={{ x: ['0%', '200%'] }}
        transition={{
          repeat: Infinity,
          duration: 1.5,
          ease: 'easeInOut',
        }}
      />
    </div>
  )
}

export function CardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('rounded-xl border border-border bg-card p-6 space-y-4', className)}>
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-lg" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-3 w-1/4" />
        </div>
      </div>
      <Skeleton className="h-24 w-full rounded-lg" />
    </div>
  )
}

export function ChartSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('rounded-xl border border-border bg-card p-6 space-y-4', className)}>
      <Skeleton className="h-5 w-1/4" />
      <div className="flex items-end gap-2 h-48">
        {Array.from({ length: 12 }).map((_, i) => (
          <Skeleton
            key={i}
            className="flex-1 rounded-t-sm"
            style={{ height: `${20 + Math.random() * 60}%` }}
          />
        ))}
      </div>
    </div>
  )
}

export function TableSkeleton({ rows = 5, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn('rounded-xl border border-border bg-card overflow-hidden', className)}>
      <div className="border-b border-border p-4">
        <div className="flex gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-4 flex-1" />
          ))}
        </div>
      </div>
      <div className="divide-y divide-border">
        {Array.from({ length: rows }).map((_, rowIdx) => (
          <div key={rowIdx} className="flex gap-4 p-4">
            {Array.from({ length: 4 }).map((_, colIdx) => (
              <Skeleton key={colIdx} className="h-4 flex-1" />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

export function StatCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('rounded-xl border border-border bg-card p-6 space-y-3', className)}>
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-8 w-20" />
      <Skeleton className="h-3 w-32" />
    </div>
  )
}
