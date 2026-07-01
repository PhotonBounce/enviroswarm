import React, { createContext, useState, useCallback, useEffect } from 'react'
import type { User, UserTier } from '@/types'
import api from '@/lib/api'
import { AxiosError } from 'axios'

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
  const [user, setUserState] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Check auth status on mount via cookie (browser sends httpOnly cookie automatically)
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await api.get('/me')
        if (response.data?.success) {
          setUserState(response.data.data)
        }
      } catch (err: unknown) {
        if (err instanceof AxiosError && err.response?.status === 401) {
          setUserState(null)
        }
      } finally {
        setIsLoading(false)
      }
    }
    checkAuth()
  }, [])

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
    setUserState(null)
  }, [])

  const setUser = useCallback((newUser: User) => {
    setUserState(newUser)
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        logout,
        setUser,
        isAuthenticated: !!user,
        tier: user?.tier ?? 'free',
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
