import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useMe } from '@/hooks/useApi'
import Layout from '@/components/layout/Layout'
import Login from '@/pages/Login'
import Register from '@/pages/Register'
import Dashboard from '@/pages/Dashboard'
import Stations from '@/pages/Stations'
import DataExplorer from '@/pages/DataExplorer'
import ApiKeys from '@/pages/ApiKeys'
import Pricing from '@/pages/Pricing'
import Profile from '@/pages/Profile'

function App() {
  const { isAuthenticated, user, setUser } = useAuth()
  const { data: meData } = useMe()

  useEffect(() => {
    if (meData && !user) {
      setUser(meData)
    }
  }, [meData, user, setUser])

  return (
    <Routes>
      <Route path="/login" element={!isAuthenticated ? <Login /> : <Navigate to="/" />} />
      <Route path="/register" element={!isAuthenticated ? <Register /> : <Navigate to="/" />} />
      <Route element={isAuthenticated ? <Layout /> : <Navigate to="/login" />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/stations" element={<Stations />} />
        <Route path="/data" element={<DataExplorer />} />
        <Route path="/apikeys" element={<ApiKeys />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/profile" element={<Profile />} />
      </Route>
    </Routes>
  )
}

export default App
