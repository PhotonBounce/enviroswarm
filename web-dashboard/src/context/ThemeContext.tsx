import React, { createContext, useContext } from 'react'
import { useTheme } from '@/hooks/useTheme'

type ThemeContextType = ReturnType<typeof useTheme>

const ThemeContext = createContext<ThemeContextType | null>(null)

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const themeState = useTheme()
  return (
    <ThemeContext.Provider value={themeState}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useThemeContext() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useThemeContext must be used within ThemeProvider')
  return ctx
}
