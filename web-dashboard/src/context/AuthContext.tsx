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
    // CRITICAL SECURITY WARNING: sessionStorage is vulnerable to XSS. Any injected
    // script can read `enviroswarm_token` and impersonate the user. We use
    // sessionStorage here because the backend does not yet support httpOnly
    // secure cookies. The recommended remediation is to move token storage to
    // httpOnly secure cookies managed by the backend, or to a service-worker
    // token vault. Do not use localStorage — it persists across sessions and
    // increases the attack surface. A strict Content-Security-Policy header has
    // been added to index.html to mitigate reflected XSS vectors.
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
