import React, { useEffect, useRef, useCallback, useId, createContext, useContext, useState } from 'react'
import { cn } from '@/lib/utils'

const DialogContext = createContext<{
  titleId: string
  descriptionId: string
  registerTitle: () => void
  registerDescription: () => void
} | null>(null)

interface DialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
  onPointerDownOutside?: (e: React.PointerEvent) => void
}

export function Dialog({ open, onOpenChange, children, onPointerDownOutside }: DialogProps) {
  const contentRef = useRef<HTMLDivElement>(null)
  const previousActiveElement = useRef<HTMLElement | null>(null)
  const titleId = useId()
  const descriptionId = useId()
  const [hasTitle, setHasTitle] = useState(false)
  const [hasDescription, setHasDescription] = useState(false)

  useEffect(() => {
    if (open) {
      previousActiveElement.current = document.activeElement as HTMLElement
      // Focus the dialog content when opened
      const content = contentRef.current
      if (content) {
        const focusable = content.querySelector<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
        if (focusable) {
          focusable.focus()
        } else {
          content.focus()
        }
      }
    }
    return () => {
      if (open && previousActiveElement.current) {
        previousActiveElement.current.focus()
      }
    }
  }, [open])

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        onOpenChange(false)
      }
      if (e.key === 'Tab') {
        const content = contentRef.current
        if (!content) return
        const focusableElements = Array.from(
          content.querySelectorAll<HTMLElement>(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          )
        ).filter((el) => !el.disabled && el.offsetParent !== null)
        if (focusableElements.length === 0) return
        const first = focusableElements[0]
        const last = focusableElements[focusableElements.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    },
    [onOpenChange]
  )

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        onPointerDown={(e) => {
          onPointerDownOutside?.(e)
          if (!e.defaultPrevented) {
            onOpenChange(false)
          }
        }}
        aria-hidden="true"
      />
      <DialogContext.Provider value={{ titleId, descriptionId, registerTitle: () => setHasTitle(true), registerDescription: () => setHasDescription(true) }}>
        <div
          ref={contentRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={hasTitle ? titleId : undefined}
          aria-describedby={hasDescription ? descriptionId : undefined}
          tabIndex={-1}
          className="relative z-50 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border bg-card p-6 text-card-foreground shadow-lg"
          onKeyDown={handleKeyDown}
        >
          {children}
        </div>
      </DialogContext.Provider>
    </div>
  )
}

export function DialogHeader({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('flex flex-col space-y-1.5 text-center sm:text-left', className)} {...props}>
      {children}
    </div>
  )
}

export function DialogTitle({ className, children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  const ctx = useContext(DialogContext)
  useEffect(() => {
    ctx?.registerTitle()
  }, [ctx])
  return (
    <h2 id={ctx?.titleId} className={cn('text-lg font-semibold leading-none tracking-tight', className)} {...props}>
      {children}
    </h2>
  )
}

export function DialogDescription({ className, children, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  const ctx = useContext(DialogContext)
  useEffect(() => {
    ctx?.registerDescription()
  }, [ctx])
  return (
    <p id={ctx?.descriptionId} className={cn('text-sm text-muted-foreground', className)} {...props}>
      {children}
    </p>
  )
}

export function DialogFooter({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2', className)} {...props}>
      {children}
    </div>
  )
}
