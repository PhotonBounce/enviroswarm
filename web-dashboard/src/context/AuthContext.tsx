import React, { createContext, useState, useCallback, useEffect, useMemo } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { User, UserTier } from '@/types'
import api from '@/lib/api'

interface AuthContextType {
  user: User | null
  isLoading: boolean
  login: (user: User) => void
  logout: () => void
  setUser: (user: User) => void
  isAuthenticated: boolean
  tier: UserTier
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  login: () => {},
  logout: () => {},
  setUser: () => {},
  isAuthenticated: false,
  tier: 'free',
})

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = useQueryClient()
  const [user, setUserState] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Listen for unauthorized events from the API interceptor
  useEffect(() => {
    const handler = () => {
      setUserState(null)
    }
    window.addEventListener('enviroswarm:unauthorized', handler)
    return () => window.removeEventListener('enviroswarm:unauthorized', handler)
  }, [])

  const login = useCallback((newUser: User) => {
    // Cookie is set by backend (httpOnly, Secure, SameSite). 
    // Browser handles it automatically — no JS storage needed.
    setUserState(newUser)
  }, [])

  const logout = useCallback(async () => {
    try {
      await api.post('/logout')
    } catch {
      // Ignore errors — cookie will expire naturally
    }
    queryClient.clear()
    setUserState(null)
  }, [queryClient])

  const setUser = useCallback((newUser: User) => {
    setUserState(newUser)
  }, [])

  const value = useMemo(() => ({
    user,
    isLoading,
    login,
    logout,
    setUser,
    isAuthenticated: !!user,
    tier: user?.tier ?? 'free',
  }), [user, isLoading, login, logout, setUser])

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
