import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { useAuthStore } from './stores/authStore'
import MainLayout from './components/layout/MainLayout'
import Login from './pages/auth/Login'
import Dashboard from './pages/Dashboard'
import Tasks from './pages/Tasks'
// import Calendar from './pages/Calendar' // temporarily disabled
import Chat from './pages/Chat'
import Reminders from './pages/Reminders'
import Profile from './pages/Profile'

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { token, user, fetchProfile } = useAuthStore()

  useEffect(() => {
    if (token && !user) {
      fetchProfile()
    }
  }, [token])

  if (!token) return <Navigate to="/login" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Login />} />
        <Route
          element={
            <AuthGuard>
              <MainLayout />
            </AuthGuard>
          }
        >
          <Route path="/" element={<Dashboard />} />
          <Route path="/tasks" element={<Tasks />} />
          {/* <Route path="/calendar" element={<Calendar />} /> temporarily disabled */}
          <Route path="/chat" element={<Chat />} />
          <Route path="/reminders" element={<Reminders />} />
          <Route path="/profile" element={<Profile />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
