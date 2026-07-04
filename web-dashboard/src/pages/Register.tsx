import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Leaf, Mail, Lock } from 'lucide-react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useRegister } from '@/hooks/useApi'
import { playClick, playSuccess, playError, markInteraction } from '@/lib/sounds'
import ParallaxBackground from '@/components/effects/ParallaxBackground'
import AnimatedBackground from '@/components/effects/AnimatedBackground'

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.15,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring' as const, stiffness: 350, damping: 25 },
  },
}

export default function Register() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const registerMutation = useRegister()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    markInteraction()
    playClick()
    setError('')
    if (password !== confirmPassword) {
      playError()
      setError('Passwords do not match')
      return
    }
    if (password.length < 8) {
      playError()
      setError('Password must be at least 8 characters')
      return
    }
    if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/\d/.test(password)) {
      playError()
      setError('Password must contain uppercase, lowercase, and numeric characters')
      return
    }
    try {
      await registerMutation.mutateAsync({ email: email.trim(), password })
      playSuccess()
      navigate('/')
    } catch (err: unknown) {
      playError()
      const message = err instanceof Error ? err.message : 'Registration failed'
      setError(message)
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-background">
      <ParallaxBackground />
      <div className="absolute inset-0 z-0">
        <AnimatedBackground />
      </div>

      <motion.div
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        className="relative z-10 w-full max-w-md mx-4"
      >
        <motion.div
          variants={itemVariants}
          className="rounded-2xl border border-border/60 bg-card/80 backdrop-blur-xl shadow-2xl p-8 space-y-6"
          style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%)',
          }}
        >
          <div className="text-center">
            <motion.div
              className="flex justify-center"
              animate={{ rotate: [0, -5, 5, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            >
              <Leaf className="h-12 w-12 text-emerald-400" />
            </motion.div>
            <motion.h2
              variants={itemVariants}
              className="mt-4 text-2xl font-bold tracking-tight text-foreground"
            >
              ENViroSwarm
            </motion.h2>
            <motion.p variants={itemVariants} className="mt-2 text-sm text-muted-foreground">
              Create a new account
            </motion.p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <motion.div variants={itemVariants} className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                  className="pl-9 bg-background/50 backdrop-blur-sm"
                  autoComplete="email"
                  required
                />
              </div>
            </motion.div>
            <motion.div variants={itemVariants} className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                  className="pl-9 bg-background/50 backdrop-blur-sm"
                  autoComplete="new-password"
                  required
                />
              </div>
            </motion.div>
            <motion.div variants={itemVariants} className="space-y-2">
              <label htmlFor="confirmPassword" className="text-sm font-medium">Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfirmPassword(e.target.value)}
                  className="pl-9 bg-background/50 backdrop-blur-sm"
                  autoComplete="new-password"
                  required
                />
              </div>
            </motion.div>
            <motion.div variants={itemVariants}>
              {error && (
                <motion.p
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="text-sm text-red-400"
                >
                  {error}
                </motion.p>
              )}
            </motion.div>
            <motion.div variants={itemVariants}>
              <Button
                type="submit"
                className="w-full"
                disabled={registerMutation.isPending}
              >
                {registerMutation.isPending ? 'Creating account...' : 'Create account'}
              </Button>
            </motion.div>
          </form>

          <motion.p variants={itemVariants} className="text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link
              to="/login"
              className="font-medium text-emerald-400 hover:text-emerald-300 transition-colors"
              onClick={() => {
                markInteraction()
                playClick()
              }}
            >
              Sign in
            </Link>
          </motion.p>
        </motion.div>
      </motion.div>
    </div>
  )
}
