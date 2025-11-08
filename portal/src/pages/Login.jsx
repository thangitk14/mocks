import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useError } from '../contexts/ErrorContext'

function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const { showError } = useError()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    console.log('[Login] Attempting login for user:', username)
    
    try {
      const result = await login(username, password)
      console.log('[Login] Login result:', result)

      if (result.success) {
        console.log('[Login] Login successful, navigating to dashboard')
        navigate('/')
      } else {
        console.error('[Login] Login failed:', result.error)
        showError(result.error || 'Login failed')
      }
    } catch (error) {
      console.error('[Login] Unexpected error:', error)
      showError(error.message || 'An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 px-4">
      <div className="bg-white dark:bg-gray-800 p-6 md:p-8 rounded-lg shadow-md w-full max-w-md">
        <h2 className="text-xl md:text-2xl font-bold mb-4 md:mb-6 text-center text-gray-800 dark:text-white">Login</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-gray-700 dark:text-gray-300 mb-2">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-2 border dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
              required
            />
          </div>
          <div>
            <label className="block text-gray-700 dark:text-gray-300 mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 bg-blue-500 dark:bg-blue-600 text-white rounded hover:bg-blue-600 dark:hover:bg-blue-700 transition disabled:opacity-50"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default Login

