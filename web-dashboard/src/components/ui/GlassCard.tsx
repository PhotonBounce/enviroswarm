import React from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

export interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  hoverLift?: boolean
  glow?: boolean
  intensity?: 'low' | 'medium' | 'high'
}

const GlassCard = React.forwardRef<HTMLDivElement, GlassCardProps>(
  ({ className, hoverLift = true, glow = false, intensity = 'medium', children, ...props }, ref) => {
    const intensityMap = {
      low: 'bg-white/30 dark:bg-black/20 border-white/20 dark:border-white/10',
      medium: 'bg-white/40 dark:bg-black/30 border-white/30 dark:border-white/15',
      high: 'bg-white/50 dark:bg-black/40 border-white/40 dark:border-white/20',
    }

    return (
      <motion.div
        ref={ref}
        className={cn(
          'relative overflow-hidden rounded-xl backdrop-blur-md',
          intensityMap[intensity],
          hoverLift && 'transition-all duration-300 hover:-translate-y-1 hover:shadow-xl',
          glow && 'shadow-[0_0_30px_rgba(16,185,129,0.1)]',
          className
        )}
        whileHover={hoverLift ? { y: -4, transition: { duration: 0.2 } } : undefined}
        {...(props as React.ComponentPropsWithoutRef<typeof motion.div>)}
      >
        {/* Gradient border effect */}
        <div
          className="absolute inset-0 rounded-xl pointer-events-none"
          style={{
            background: 'linear-gradient(135deg, rgba(52,211,153,0.15) 0%, rgba(6,182,212,0.08) 50%, transparent 100%)',
            mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
            maskComposite: 'exclude',
            WebkitMaskComposite: 'xor',
            padding: '1px',
          }}
        />
        {children}
      </motion.div>
    )
  }
)
GlassCard.displayName = 'GlassCard'

export { GlassCard }
