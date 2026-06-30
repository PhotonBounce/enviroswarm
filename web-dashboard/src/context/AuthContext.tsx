import { createContext, useState, useCallback, useEffect } from 'react'
import type { User, UserTier } from '@/types'

interface AuthContextType {
  user: User | null
  token: string | null
  isLoading: boolean
  login: (token: string, user: User) => void
  logout: () => void
  setUser: (user: User) => void
  isAuthenticated: boolean
  tier: UserTier
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  isLoading: true,
  login: () => {},
  logout: () => {},
  setUser: () => {},
  isAuthenticated: false,
  tier: 'free',
})

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUserState] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const storedToken = sessionStorage.getItem('enviroswarm_token')
    const storedUser = sessionStorage.getItem('enviroswarm_user')
    if (storedToken && storedUser) {
      try {
        setToken(storedToken)
        setUserState(JSON.parse(storedUser))
      } catch {
        sessionStorage.removeItem('enviroswarm_token')
        sessionStorage.removeItem('enviroswarm_user')
      }
    }
    setIsLoading(false)
  }, [])

  // Listen for unauthorized events from the API interceptor
  useEffect(() => {
    const handler = () => {
      sessionStorage.removeItem('enviroswarm_token')
      sessionStorage.removeItem('enviroswarm_user')
      setToken(null)
      setUserState(null)
    }
    window.addEventListener('enviroswarm:unauthorized', handler)
    return () => window.removeEventListener('enviroswarm:unauthorized', handler)
  }, [])

  const login = useCallback((newToken: string, newUser: User) => {
    // SECURITY NOTE: sessionStorage reduces XSS persistence compared to localStorage.
    // For full protection, migrate to httpOnly secure cookies backed by the server.
    sessionStorage.setItem('enviroswarm_token', newToken)
    sessionStorage.setItem('enviroswarm_user', JSON.stringify(newUser))
    setToken(newToken)
    setUserState(newUser)
  }, [])

  const logout = useCallback(() => {
    sessionStorage.removeItem('enviroswarm_token')
    sessionStorage.removeItem('enviroswarm_user')
    setToken(null)
    setUserState(null)
  }, [])

  const setUser = useCallback((newUser: User) => {
    sessionStorage.setItem('enviroswarm_user', JSON.stringify(newUser))
    setUserState(newUser)
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        logout,
        setUser,
        isAuthenticated: !!token,
        tier: user?.tier ?? 'free',
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
