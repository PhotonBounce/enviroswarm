import React, { useRef, useEffect, useCallback } from 'react'

interface ParticleNode {
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  opacity: number
}

export default function AnimatedBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const particlesRef = useRef<ParticleNode[]>([])
  const mouseRef = useRef({ x: -1000, y: -1000 })
  const rafRef = useRef<number>(0)

  const initParticles = useCallback((w: number, h: number) => {
    const count = Math.min(80, Math.floor((w * h) / 18000))
    const particles: ParticleNode[] = []
    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        radius: Math.random() * 2 + 1,
        opacity: Math.random() * 0.5 + 0.2,
      })
    }
    particlesRef.current = particles
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const parent = canvas.parentElement
      const w = parent ? parent.clientWidth : window.innerWidth
      const h = parent ? parent.clientHeight : window.innerHeight
      canvas.width = w * dpr
      canvas.height = h * dpr
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      initParticles(w, h)
    }

    resize()
    const resizeObserver = new ResizeObserver(resize)
    if (canvas.parentElement) resizeObserver.observe(canvas.parentElement)

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      mouseRef.current.x = e.clientX - rect.left
      mouseRef.current.y = e.clientY - rect.top
    }
    const handleMouseLeave = () => {
      mouseRef.current.x = -1000
      mouseRef.current.y = -1000
    }
    canvas.addEventListener('mousemove', handleMouseMove)
    canvas.addEventListener('mouseleave', handleMouseLeave)

    const draw = () => {
      const w = canvas.parentElement ? canvas.parentElement.clientWidth : window.innerWidth
      const h = canvas.parentElement ? canvas.parentElement.clientHeight : window.innerHeight
      ctx.clearRect(0, 0, w, h)

      const particles = particlesRef.current
      const maxDist = 120

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i]
        p.x += p.vx
        p.y += p.vy

        // Bounce off edges
        if (p.x < 0 || p.x > w) p.vx *= -1
        if (p.y < 0 || p.y > h) p.vy *= -1
        p.x = Math.max(0, Math.min(w, p.x))
        p.y = Math.max(0, Math.min(h, p.y))

        // Mouse repulsion
        const mdx = mouseRef.current.x - p.x
        const mdy = mouseRef.current.y - p.y
        const mDist = Math.sqrt(mdx * mdx + mdy * mdy)
        if (mDist < 150 && mDist > 0) {
          const force = (150 - mDist) / 150 * 0.5
          p.vx -= (mdx / mDist) * force
          p.vy -= (mdy / mDist) * force
        }

        // Draw connections
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j]
          const dx = p.x - p2.x
          const dy = p.y - p2.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < maxDist) {
            const alpha = (1 - dist / maxDist) * 0.2 * p.opacity
            ctx.beginPath()
            ctx.strokeStyle = `rgba(52, 211, 153, ${alpha})`
            ctx.lineWidth = 0.5
            ctx.moveTo(p.x, p.y)
            ctx.lineTo(p2.x, p2.y)
            ctx.stroke()
          }
        }

        // Draw particle
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(16, 185, 129, ${p.opacity})`
        ctx.fill()
      }

      rafRef.current = requestAnimationFrame(draw)
    }

    rafRef.current = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(rafRef.current)
      resizeObserver.disconnect()
      canvas.removeEventListener('mousemove', handleMouseMove)
      canvas.removeEventListener('mouseleave', handleMouseLeave)
    }
  }, [initParticles])

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-auto"
      style={{ zIndex: 0 }}
      aria-hidden="true"
    />
  )
}
