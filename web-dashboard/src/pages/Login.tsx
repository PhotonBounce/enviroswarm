import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Leaf, Mail, Lock, Sparkles } from 'lucide-react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useLogin, useDemo } from '@/hooks/useApi'
import { enableDemoMode } from '@/lib/demoData'
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

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const loginMutation = useLogin()
  const demoMutation = useDemo()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    markInteraction()
    playClick()
    setError('')
    try {
      await loginMutation.mutateAsync({ email: email.trim(), password })
      playSuccess()
      navigate('/')
    } catch (err: unknown) {
      playError()
      const message = err instanceof Error ? err.message : 'Login failed'
      setError(message)
    }
  }

  const handleDemo = async () => {
    markInteraction()
    playClick()
    setError('')
    enableDemoMode()
    try {
      await demoMutation.mutateAsync()
      playSuccess()
      navigate('/')
    } catch (err: unknown) {
      playError()
      const message = err instanceof Error ? err.message : 'Demo access failed'
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
              Sign in to your dashboard
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
                  autoComplete="current-password"
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
                disabled={loginMutation.isPending}
                onMouseEnter={() => {
                  /* subtle hover feedback could go here */
                }}
              >
                {loginMutation.isPending ? 'Signing in...' : 'Sign in'}
              </Button>
            </motion.div>
          </form>

          {/* Demo Access */}
          <motion.div variants={itemVariants} className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-card px-2 text-muted-foreground">or</span>
            </div>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Button
              variant="outline"
              className="w-full border-emerald-600/50 text-emerald-400 hover:bg-emerald-950/30 hover:text-emerald-300"
              onClick={handleDemo}
              disabled={demoMutation.isPending}
            >
              <Sparkles className="mr-2 h-4 w-4" />
              {demoMutation.isPending ? 'Loading demo...' : 'Try Demo — Free for 30 Days'}
            </Button>
            <p className="text-center text-xs text-muted-foreground mt-2">
              No signup required. All features unlocked.
            </p>
          </motion.div>

          <motion.p variants={itemVariants} className="text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{' '}
            <Link
              to="/register"
              className="font-medium text-emerald-400 hover:text-emerald-300 transition-colors"
              onClick={() => {
                markInteraction()
                playClick()
              }}
            >
              Sign up
            </Link>
          </motion.p>
        </motion.div>
      </motion.div>
    </div>
  )
}
