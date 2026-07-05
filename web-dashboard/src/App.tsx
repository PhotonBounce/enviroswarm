import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { useMe } from '@/hooks/useApi'
import { isDemoMode, demoUser } from '@/lib/demoData'
import Layout from '@/components/layout/Layout'
import Login from '@/pages/Login'
import Register from '@/pages/Register'
import Dashboard from '@/pages/Dashboard'
import LandingPage from '@/pages/LandingPage'
import PollutionMap from '@/pages/PollutionMap'
import HealthImpact from '@/pages/HealthImpact'
import CommunityAlerts from '@/pages/CommunityAlerts'
import Stations from '@/pages/Stations'
import DataExplorer from '@/pages/DataExplorer'
import Reports from '@/pages/Reports'
import ApiKeys from '@/pages/ApiKeys'
import Pricing from '@/pages/Pricing'
import Profile from '@/pages/Profile'
import Portal from '@/pages/Portal'
import ProjectWorkspace from '@/pages/ProjectWorkspace'
import DatasetDetail from '@/pages/DatasetDetail'
import Community from '@/pages/Community'
import DownloadPage from '@/pages/Download'
import Notebook from '@/components/Notebook'

function App() {
  const queryClient = useQueryClient()
  const { isAuthenticated, setUser } = useAuth()
  const { data: meData, isLoading: meLoading } = useMe()
  const [authReady, setAuthReady] = useState(false)

  const demoActive = isDemoMode()

  useEffect(() => {
    if (demoActive) {
      setUser(demoUser)
      setAuthReady(true)
      return
    }
    const timer = setTimeout(() => {
      setAuthReady(true)
    }, 3000)
    if (!meLoading) {
      setAuthReady(true)
      clearTimeout(timer)
    }
    return () => clearTimeout(timer)
  }, [meLoading, demoActive, setUser])

  useEffect(() => {
    if (meData) {
      setUser(meData)
    }
  }, [meData, setUser])

  useEffect(() => {
    const handler = () => {
      queryClient.removeQueries({ queryKey: ['me'] })
    }
    window.addEventListener('enviroswarm:unauthorized', handler)
    return () => window.removeEventListener('enviroswarm:unauthorized', handler)
  }, [queryClient])

  if (!authReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-400" />
      </div>
    )
  }

  return (
    <Routes>
      <Route path="/login" element={!isAuthenticated ? <Login /> : <Navigate to="/" replace />} />
      <Route path="/register" element={!isAuthenticated ? <Register /> : <Navigate to="/" replace />} />
      <Route path="/get-app" element={<DownloadPage />} />
      <Route element={isAuthenticated ? <Layout /> : <Navigate to="/login" replace />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/landing" element={<LandingPage />} />
        <Route path="/map" element={<PollutionMap />} />
        <Route path="/health" element={<HealthImpact />} />
        <Route path="/alerts" element={<CommunityAlerts />} />
        <Route path="/stations" element={<Stations />} />
        <Route path="/data" element={<DataExplorer />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/apikeys" element={<ApiKeys />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/portal" element={<Portal />} />
        <Route path="/project/:id" element={<ProjectWorkspace />} />
        <Route path="/dataset/:id" element={<DatasetDetail />} />
        <Route path="/community" element={<Community />} />
        <Route path="/notebook" element={<Notebook />} />
      </Route>
    </Routes>
  )
}

export default App
