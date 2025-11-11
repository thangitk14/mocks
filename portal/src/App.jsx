import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ThemeProvider } from './contexts/ThemeContext'
import Login from './pages/Login'
import MainPage from './pages/MainPage'
import Dashboard from './pages/Dashboard'
import Roles from './pages/Roles'
import RoleUser from './pages/RoleUser'
import Users from './pages/Users'
import Functions from './pages/Functions'
import MappingDomain from './pages/MappingDomain'
import ApiLogs from './pages/ApiLogs'
import MockResponses from './pages/MockResponses'
import ChangePassword from './pages/ChangePassword'
import ErrorDialog from './components/ErrorDialog'
import { ErrorProvider } from './contexts/ErrorContext'
import { ConfirmProvider } from './contexts/ConfirmContext'

function PrivateRoute({ children }) {
  const { isAuthenticated, loading } = useAuth()
  
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>
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
        <Route path="functions" element={<Functions />} />
        <Route path="change-password" element={<ChangePassword />} />
        <Route path="mapping-domain" element={<MappingDomain />} />
        <Route path="mapping-domain/:domainId/logs" element={<ApiLogs />} />
        <Route path="mapping-domain/:domainId/mocks" element={<MockResponses />} />
      </Route>
    </Routes>
  )
}

function App() {
  return (
    <ThemeProvider>
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
    </ThemeProvider>
  )
}

export default App
