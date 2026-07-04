import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'

export default function Layout() {
  return (
    <div className="min-h-screen bg-background relative">
      <Sidebar />
      <div className="md:pl-64 relative z-10">
        <Header />
        <main className="p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
