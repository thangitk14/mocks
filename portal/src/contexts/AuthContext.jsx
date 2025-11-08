import { createContext, useContext, useState, useEffect } from 'react'
import api from '../services/api'

const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(localStorage.getItem('token'))
  const [loading, setLoading] = useState(true)
  const [permissions, setPermissions] = useState([])

  useEffect(() => {
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`
      fetchProfile()
    } else {
      setLoading(false)
    }
  }, [token])

  const fetchProfile = async () => {
    try {
      const response = await api.get('/api/auth/profile')
      setUser(response.data.data)
      // Extract permissions from user roles
      const userPermissions = extractPermissions(response.data.data)
      setPermissions(userPermissions)
      setLoading(false)
    } catch (error) {
      console.error('Failed to fetch profile:', error)
      logout()
    }
  }

  const extractPermissions = (userData) => {
    if (!userData || !userData.roles) return []
    const perms = []
    userData.roles.forEach(role => {
      if (role.path) {
        perms.push(role.path)
      }
    })
    return perms
  }

  const hasPermission = (path) => {
    if (!path) return true
    return permissions.some(perm => {
      if (perm.endsWith('/*')) {
        const basePath = perm.slice(0, -2)
        return path.startsWith(basePath)
      }
      return perm === path
    })
  }

  const login = async (username, password) => {
    try {
      const response = await api.post('/api/auth/login', { username, password })
      
      // Check if response is successful
      if (!response.data || !response.data.success) {
        console.error('Login failed - invalid response:', response.data)
        return {
          success: false,
          error: response.data?.error?.message || response.data?.message || 'Invalid response from server'
        }
      }

      // Check if token exists in response
      if (!response.data.data || !response.data.data.token) {
        console.error('Login failed - no token in response:', response.data)
        return {
          success: false,
          error: 'No token received from server'
        }
      }

      const { token: newToken } = response.data.data
      setToken(newToken)
      localStorage.setItem('token', newToken)
      api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`
      await fetchProfile()
      return { success: true }
    } catch (error) {
      console.error('Login error:', error)
      console.error('Error response:', error.response)
      
      // Handle network errors
      if (!error.response) {
        return {
          success: false,
          error: `Network error: ${error.message || 'Cannot connect to server'}`
        }
      }

      // Handle API errors
      const errorData = error.response.data
      const errorMessage = errorData?.error?.message || errorData?.message || error.message || 'Login failed'
      
      return {
        success: false,
        error: errorMessage
      }
    }
  }

  const logout = () => {
    setToken(null)
    setUser(null)
    setPermissions([])
    localStorage.removeItem('token')
    delete api.defaults.headers.common['Authorization']
  }

  const isAuthenticated = !!token && !!user

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated,
        loading,
        login,
        logout,
        hasPermission,
        permissions
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}

