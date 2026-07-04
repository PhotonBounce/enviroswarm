import { useState, useEffect, useCallback } from 'react'

type Theme = 'dark' | 'light' | 'system'

function getSystemTheme(): 'dark' | 'light' {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function getResolvedTheme(theme: Theme): 'dark' | 'light' {
  if (theme === 'system') return getSystemTheme()
  return theme
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(() => {
    try {
      const stored = localStorage.getItem('enviroswarm-theme') as Theme | null
      return stored ?? 'system'
    } catch {
      return 'system'
    }
  })

  const [resolvedTheme, setResolvedTheme] = useState<'dark' | 'light'>(() =>
    getResolvedTheme(theme)
  )

  const applyTheme = useCallback((t: Theme) => {
    const resolved = getResolvedTheme(t)
    setResolvedTheme(resolved)
    const root = document.documentElement
    if (resolved === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
    root.style.colorScheme = resolved
  }, [])

  useEffect(() => {
    applyTheme(theme)
    try {
      localStorage.setItem('enviroswarm-theme', theme)
    } catch {
      // ignore
    }
  }, [theme, applyTheme])

  useEffect(() => {
    if (theme !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => applyTheme('system')
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [theme, applyTheme])

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t)
  }, [])

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => {
      if (prev === 'dark') return 'light'
      if (prev === 'light') return 'dark'
      return getSystemTheme() === 'dark' ? 'light' : 'dark'
    })
  }, [])

  return { theme, resolvedTheme, setTheme, toggleTheme }
}
