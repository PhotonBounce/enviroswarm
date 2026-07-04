import React, { useRef, useEffect, useCallback } from 'react'
import { Leaf, Droplets, Wind, Sun, CloudRain } from 'lucide-react'

interface Particle {
  x: number
  y: number
  size: number
  speedX: number
  speedY: number
  opacity: number
  type: 'leaf' | 'drop' | 'dot'
  rotation: number
  rotationSpeed: number
}

interface FloatingIcon {
  x: number
  y: number
  targetX: number
  targetY: number
  icon: number
  size: number
  opacity: number
  speed: number
}

export default function ParallaxBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const mouseRef = useRef({ x: 0, y: 0 })
  const particlesRef = useRef<Particle[]>([])
  const iconsRef = useRef<FloatingIcon[]>([])
  const rafRef = useRef<number>(0)

  const initParticles = useCallback((w: number, h: number) => {
    const particles: Particle[] = []
    const count = Math.min(60, Math.floor((w * h) / 25000))
    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * w,
        y: Math.random() * h,
        size: Math.random() * 3 + 1,
        speedX: (Math.random() - 0.5) * 0.3,
        speedY: (Math.random() - 0.5) * 0.3,
        opacity: Math.random() * 0.4 + 0.1,
        type: Math.random() > 0.7 ? 'leaf' : Math.random() > 0.5 ? 'drop' : 'dot',
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.01,
      })
    }
    particlesRef.current = particles

    const icons: FloatingIcon[] = []
    const iconCount = 5
    for (let i = 0; i < iconCount; i++) {
      icons.push({
        x: Math.random() * w,
        y: Math.random() * h,
        targetX: Math.random() * w,
        targetY: Math.random() * h,
        icon: i,
        size: 20 + Math.random() * 16,
        opacity: 0.08 + Math.random() * 0.06,
        speed: 0.2 + Math.random() * 0.3,
      })
    }
    iconsRef.current = icons
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resize = () => {
      const dpr = window.devicePixelRatio || 1
      const w = window.innerWidth
      const h = window.innerHeight
      canvas.width = w * dpr
      canvas.height = h * dpr
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      initParticles(w, h)
    }

    resize()
    window.addEventListener('resize', resize)

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current.x = e.clientX
      mouseRef.current.y = e.clientY
    }
    window.addEventListener('mousemove', handleMouseMove)

    const draw = () => {
      const w = window.innerWidth
      const h = window.innerHeight
      ctx.clearRect(0, 0, w, h)

      // Draw gradient mesh background
      const gradient = ctx.createRadialGradient(
        w * 0.3 + (mouseRef.current.x - w / 2) * 0.02,
        h * 0.3 + (mouseRef.current.y - h / 2) * 0.02,
        0,
        w * 0.5,
        h * 0.5,
        Math.max(w, h) * 0.8
      )
      gradient.addColorStop(0, 'rgba(16, 185, 129, 0.06)')
      gradient.addColorStop(0.5, 'rgba(6, 182, 212, 0.03)')
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)')
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, w, h)

      // Second glow spot
      const gradient2 = ctx.createRadialGradient(
        w * 0.7 - (mouseRef.current.x - w / 2) * 0.015,
        h * 0.6 - (mouseRef.current.y - h / 2) * 0.015,
        0,
        w * 0.7,
        h * 0.6,
        Math.max(w, h) * 0.5
      )
      gradient2.addColorStop(0, 'rgba(52, 211, 153, 0.04)')
      gradient2.addColorStop(1, 'rgba(0, 0, 0, 0)')
      ctx.fillStyle = gradient2
      ctx.fillRect(0, 0, w, h)

      // Update and draw particles
      particlesRef.current.forEach((p) => {
        p.x += p.speedX
        p.y += p.speedY
        p.rotation += p.rotationSpeed

        // Mouse parallax
        const dx = mouseRef.current.x - p.x
        const dy = mouseRef.current.y - p.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < 300) {
          const force = (300 - dist) / 300 * 0.02
          p.x -= dx * force
          p.y -= dy * force
        }

        // Wrap around
        if (p.x < -10) p.x = w + 10
        if (p.x > w + 10) p.x = -10
        if (p.y < -10) p.y = h + 10
        if (p.y > h + 10) p.y = -10

        ctx.save()
        ctx.translate(p.x, p.y)
        ctx.rotate(p.rotation)
        ctx.globalAlpha = p.opacity

        if (p.type === 'leaf') {
          ctx.fillStyle = '#34d399'
          ctx.beginPath()
          ctx.ellipse(0, 0, p.size * 2, p.size, 0, 0, Math.PI * 2)
          ctx.fill()
        } else if (p.type === 'drop') {
          ctx.fillStyle = '#06b6d4'
          ctx.beginPath()
          ctx.arc(0, p.size, p.size, 0, Math.PI * 2)
          ctx.fill()
        } else {
          ctx.fillStyle = '#10b981'
          ctx.beginPath()
          ctx.arc(0, 0, p.size, 0, Math.PI * 2)
          ctx.fill()
        }
        ctx.restore()
      })

      // Draw floating icons
      iconsRef.current.forEach((icon) => {
        icon.x += (icon.targetX - icon.x) * icon.speed * 0.01
        icon.y += (icon.targetY - icon.y) * icon.speed * 0.01

        if (Math.abs(icon.x - icon.targetX) < 5 && Math.abs(icon.y - icon.targetY) < 5) {
          icon.targetX = Math.random() * w
          icon.targetY = Math.random() * h
        }

        ctx.save()
        ctx.globalAlpha = icon.opacity
        ctx.strokeStyle = '#34d399'
        ctx.lineWidth = 1.5
        ctx.translate(icon.x, icon.y)

        // Draw simple icon shapes using canvas paths
        const s = icon.size / 2
        if (icon.icon === 0) {
          // Leaf shape
          ctx.beginPath()
          ctx.moveTo(0, -s)
          ctx.quadraticCurveTo(s, -s / 2, 0, s)
          ctx.quadraticCurveTo(-s, -s / 2, 0, -s)
          ctx.stroke()
          ctx.beginPath()
          ctx.moveTo(0, -s * 0.7)
          ctx.lineTo(0, s * 0.7)
          ctx.stroke()
        } else if (icon.icon === 1) {
          // Drop shape
          ctx.beginPath()
          ctx.moveTo(0, -s)
          ctx.quadraticCurveTo(s, 0, 0, s)
          ctx.quadraticCurveTo(-s, 0, 0, -s)
          ctx.stroke()
        } else if (icon.icon === 2) {
          // Wind lines
          for (let i = -1; i <= 1; i++) {
            ctx.beginPath()
            ctx.moveTo(-s, i * s * 0.4)
            ctx.quadraticCurveTo(0, i * s * 0.4 - s * 0.2, s, i * s * 0.4)
            ctx.stroke()
          }
        } else if (icon.icon === 3) {
          // Sun
          ctx.beginPath()
          ctx.arc(0, 0, s * 0.5, 0, Math.PI * 2)
          ctx.stroke()
          for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2
            ctx.beginPath()
            ctx.moveTo(Math.cos(angle) * s * 0.6, Math.sin(angle) * s * 0.6)
            ctx.lineTo(Math.cos(angle) * s, Math.sin(angle) * s)
            ctx.stroke()
          }
        } else {
          // Cloud with rain
          ctx.beginPath()
          ctx.arc(-s * 0.3, -s * 0.2, s * 0.4, 0, Math.PI * 2)
          ctx.arc(s * 0.3, -s * 0.2, s * 0.35, 0, Math.PI * 2)
          ctx.arc(0, -s * 0.4, s * 0.35, 0, Math.PI * 2)
          ctx.stroke()
          for (let i = -1; i <= 1; i++) {
            ctx.beginPath()
            ctx.moveTo(i * s * 0.3, s * 0.2)
            ctx.lineTo(i * s * 0.3 - s * 0.1, s * 0.6)
            ctx.stroke()
          }
        }
        ctx.restore()
      })

      rafRef.current = requestAnimationFrame(draw)
    }

    rafRef.current = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(rafRef.current)
      window.removeEventListener('resize', resize)
      window.removeEventListener('mousemove', handleMouseMove)
    }
  }, [initParticles])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 0 }}
      aria-hidden="true"
    />
  )
}
