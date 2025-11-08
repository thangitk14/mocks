import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Login from './pages/Login'
import MainPage from './pages/MainPage'
import Dashboard from './pages/Dashboard'
import Roles from './pages/Roles'
import RoleUser from './pages/RoleUser'
import Users from './pages/Users'
import ErrorDialog from './components/ErrorDialog'
import { ErrorProvider } from './contexts/ErrorContext'
import { ConfirmProvider } from './contexts/ConfirmContext'

function PrivateRoute({ children }) {
  const { isAuthenticated, loading } = useAuth()
  
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Đang tải...</div>
  }
  
  return isAuthenticated ? children : <Navigate to="/login" />
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <PrivateRoute>
            <MainPage />
          </PrivateRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="roles" element={<Roles />} />
        <Route path="role-user" element={<RoleUser />} />
        <Route path="users" element={<Users />} />
      </Route>
    </Routes>
  )
}

function App() {
  return (
    <ErrorProvider>
      <ConfirmProvider>
        <AuthProvider>
          <Router>
            <AppRoutes />
            <ErrorDialog />
          </Router>
        </AuthProvider>
      </ConfirmProvider>
    </ErrorProvider>
  )
}

export default App
