import React, { createContext, useState, useCallback, useEffect, useMemo } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { User, UserTier } from '@/types'
import api from '@/lib/api'
import { enableDemoMode, disableDemoMode, isDemoMode, demoUser } from '@/lib/demoData'

interface TrialInfo {
  startDate: string
  endDate: string
  active: boolean
  daysRemaining: number
}

interface AuthContextType {
  user: User | null
  isLoading: boolean
  login: (user: User) => void
  logout: () => void
  setUser: (user: User) => void
  isAuthenticated: boolean
  tier: UserTier
  trial: TrialInfo | null
  isTrialActive: boolean
}

const TRIAL_DAYS = 7

function getTrialInfo(): TrialInfo | null {
  const trialData = localStorage.getItem('enviroswarm_trial')
  if (!trialData) return null
  try {
    const { startDate } = JSON.parse(trialData)
    const start = new Date(startDate)
    const end = new Date(start)
    end.setDate(end.getDate() + TRIAL_DAYS)
    const now = new Date()
    const daysRemaining = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    return {
      startDate,
      endDate: end.toISOString(),
      active: daysRemaining > 0,
      daysRemaining: Math.max(0, daysRemaining),
    }
  } catch {
    return null
  }
}

function startTrial(): TrialInfo {
  const startDate = new Date().toISOString()
  const endDate = new Date()
  endDate.setDate(endDate.getDate() + TRIAL_DAYS)
  localStorage.setItem('enviroswarm_trial', JSON.stringify({ startDate }))
  return {
    startDate,
    endDate: endDate.toISOString(),
    active: true,
    daysRemaining: TRIAL_DAYS,
  }
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  login: () => {},
  logout: () => {},
  setUser: () => {},
  isAuthenticated: false,
  tier: 'free',
  trial: null,
  isTrialActive: false,
})

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = useQueryClient()
  const [user, setUserState] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [trial, setTrial] = useState<TrialInfo | null>(getTrialInfo())

  useEffect(() => {
    if (isDemoMode()) {
      setUserState(demoUser)
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    const handler = () => {
      setUserState(null)
      disableDemoMode()
    }
    window.addEventListener('enviroswarm:unauthorized', handler)
    return () => window.removeEventListener('enviroswarm:unauthorized', handler)
  }, [])

  // Check trial status periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setTrial(getTrialInfo())
    }, 60000) // Check every minute
    return () => clearInterval(interval)
  }, [])

  const login = useCallback((newUser: User) => {
    // Start trial for new registrations
    const existingTrial = getTrialInfo()
    if (!existingTrial) {
      startTrial()
      setTrial(getTrialInfo())
      // Upgrade user to enterprise during trial
      newUser = { ...newUser, tier: 'enterprise' as UserTier }
    } else if (existingTrial.active) {
      newUser = { ...newUser, tier: 'enterprise' as UserTier }
    }
    setUserState(newUser)
  }, [])

  const logout = useCallback(async () => {
    try {
      if (!isDemoMode()) {
        await api.post('/logout')
      }
    } catch {
      // Ignore errors
    }
    disableDemoMode()
    queryClient.clear()
    setUserState(null)
  }, [queryClient])

  const setUser = useCallback((newUser: User) => {
    const t = getTrialInfo()
    if (t?.active) {
      newUser = { ...newUser, tier: 'enterprise' as UserTier }
    }
    setUserState(newUser)
  }, [])

  const effectiveTier = useMemo(() => {
    if (isDemoMode()) return 'enterprise' as UserTier
    if (trial?.active) return 'enterprise' as UserTier
    return user?.tier ?? 'free'
  }, [user, trial])

  const value = useMemo(() => ({
    user,
    isLoading,
    login,
    logout,
    setUser,
    isAuthenticated: !!user || isDemoMode(),
    tier: effectiveTier,
    trial,
    isTrialActive: trial?.active ?? false,
  }), [user, isLoading, login, logout, setUser, effectiveTier, trial])

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
