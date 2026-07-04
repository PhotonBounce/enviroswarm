import { motion, AnimatePresence } from 'framer-motion'
import { useLocation, useOutlet } from 'react-router-dom'
import { ReactNode } from 'react'

const pageVariants = {
  initial: { opacity: 0, x: -20, scale: 0.98 },
  animate: { opacity: 1, x: 0, scale: 1 },
  exit: { opacity: 0, x: 20, scale: 0.98 },
}

const pageTransition = {
  type: 'spring' as const,
  stiffness: 300,
  damping: 30,
}

interface PageTransitionProps {
  children: ReactNode
}

export function AnimatedPage({ children }: PageTransitionProps) {
  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={pageTransition}
      className="h-full"
    >
      {children}
    </motion.div>
  )
}

export function PageTransitionWrapper() {
  const location = useLocation()
  const outlet = useOutlet()

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        variants={pageVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={pageTransition}
        className="h-full"
      >
        {outlet}
      </motion.div>
    </AnimatePresence>
  )
}

export function StaggerContainer({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode
  className?: string
  delay?: number
}) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: {
          transition: {
            staggerChildren: 0.08,
            delayChildren: delay,
          },
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

export function StaggerItem({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 16 },
        visible: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 400, damping: 30 } },
      }}
      className={className}
    >
      {children}
    </motion.div>
  )
}
